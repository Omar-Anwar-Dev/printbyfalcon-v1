'use server';

/**
 * Checkout — createOrder + submitForReview Server Actions.
 *
 * Sprint 9 rewrite: shipping/VAT/COD fee/promo-code discount are now all
 * computed from authoritative server-side sources (ShippingZone rows, COD
 * policy Setting, VAT rate Setting, PromoCode row). The client-side form
 * shows a preview built from the same inputs and re-computed identically;
 * the server is the only one writing to the Order row, so the preview is
 * just a UX nicety — never trusted.
 *
 * Transaction shape (unchanged from Sprint 4 except for the extra Sprint 9
 * writes):
 *  1. Validate payload (zod).
 *  2. Resolve shipping quote (zone + free-ship + COD availability).
 *  3. Validate promo code (if any).
 *  4. Re-check stock excluding this cart's own CART reservations.
 *  5. Inside a single DB transaction:
 *       a. Allocate order number.
 *       b. Create Order + OrderItem rows (with snapshotted subtotal /
 *          shipping / codFee / discount / vat / total).
 *       c. Atomically consume the promo code (rollback if exhausted).
 *       d. Convert CART reservations → ORDER reservations.
 *       e. Race-safe inventory decrement (ADR-036).
 *       f. InventoryMovement + OrderStatusEvent + AuditLog.
 *       g. Empty the cart.
 *  6. For Paymob card: call Paymob with the full total (includes shipping
 *     + COD fee + VAT − discount) → return iframeUrl.
 *  7. For COD: enqueue the localized confirmation email (parked-item fix
 *     per Sprint 4 — Sprint 9 also mirrors this to the Paymob webhook on
 *     PAID so card customers get the email too).
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Governorate, PaymentMethod, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { getOrCreateCart } from '@/lib/cart/cart';
import { getAvailableQtyMap } from '@/lib/cart/stock';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { notifySalesRepsOfPendingOrder } from '@/lib/b2b/sales-rep-notify';
import { generateOrderNumber } from '@/lib/order/order-number';
import { createPaymentKey } from '@/lib/payments/paymob';
import { enqueueJob } from '@/lib/queue';
import { renderOrderConfirmationEmail } from '@/lib/email/order-confirmation';
import { renderB2bPendingReview } from '@/lib/whatsapp-templates';
import { ensureInvoiceForOrder } from '@/lib/invoices/ensure';
import { sendInvoiceToCustomer } from '@/lib/invoices/delivery';
import { resolveShippingQuote } from '@/lib/shipping/resolve';
import { getVatRate, computeLineVat } from '@/lib/settings/vat';
import { validatePromoCode, tryConsumePromoCode } from '@/lib/promo/validate';
import { logger } from '@/lib/logger';

// SLA window for the B2B "we'll contact you within N hours" copy.
const B2B_SFR_SLA_HOURS = 24;

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: Record<string, string>;
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'validation.phone.invalid_eg'),
  governorate: z.nativeEnum(Governorate),
  city: z.string().trim().min(1).max(80),
  area: z.string().trim().max(80).optional().or(z.literal('')),
  street: z.string().trim().min(1).max(160),
  building: z.string().trim().max(40).optional().or(z.literal('')),
  apartment: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(280).optional().or(z.literal('')),
});

const checkoutSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, 'validation.phone.invalid_eg'),
    email: z.string().trim().email().optional().or(z.literal('')),
  }),
  address: addressSchema,
  paymentMethod: z.enum(['PAYMOB_CARD', 'PAYMOB_FAWRY', 'COD']),
  customerNotes: z.string().trim().max(500).optional().or(z.literal('')),
  placedByName: z.string().trim().max(80).optional().or(z.literal('')),
  poReference: z.string().trim().max(40).optional().or(z.literal('')),
  /// Sprint 9: optional promo code applied at checkout. Validated server-side
  /// AND consumed atomically inside the order-creation transaction.
  promoCode: z.string().trim().max(40).optional().or(z.literal('')),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

type CreateOrderSuccess = {
  orderId: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  redirectUrl: string;
};

function toNullable<T extends string | undefined>(v: T): string | null {
  return v && v.trim().length > 0 ? v.trim() : null;
}

function roundEgp(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createOrderAction(
  input: CheckoutInput,
): Promise<ActionResult<CreateOrderSuccess>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'validation.invalid' };
  }

  const user = await getOptionalUser();
  const b2bCtx = await getB2BCheckoutContext();
  const isB2BOrder = b2bCtx !== null;
  if (isB2BOrder && !b2bCtx!.allowPayNow) {
    return { ok: false, errorKey: 'checkout.pay_now_not_allowed' };
  }

  const cart = await getOrCreateCart();
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          nameAr: true,
          nameEn: true,
          basePriceEgp: true,
          vatExempt: true,
          status: true,
        },
      },
    },
  });
  if (items.length === 0) return { ok: false, errorKey: 'cart.empty' };
  const inactive = items.find((i) => i.product.status !== 'ACTIVE');
  if (inactive) return { ok: false, errorKey: 'cart.item_unavailable' };

  // Re-validate stock excluding the caller's own CART reservations.
  const reservationRefIds = items.map((i) => i.id);
  const availability = await getAvailableQtyMap(
    items.map((i) => i.product.id),
    reservationRefIds,
  );
  for (const i of items) {
    const avail = availability.get(i.product.id) ?? 0;
    if (avail < i.qty) {
      return { ok: false, errorKey: 'cart.insufficient_stock' };
    }
  }

  const subtotal = roundEgp(
    items.reduce((acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty, 0),
  );

  // Sprint 9: resolve shipping + COD availability + COD fee in one call.
  const quote = await resolveShippingQuote({
    governorate: parsed.data.address.governorate,
    subtotalEgp: subtotal,
    viewer: isB2BOrder ? 'B2B' : 'B2C',
    method: parsed.data.paymentMethod === 'COD' ? 'COD' : undefined,
  });
  if (quote.unknownZone) {
    return { ok: false, errorKey: 'checkout.zone_not_configured' };
  }
  if (parsed.data.paymentMethod === 'COD' && !quote.codAvailable) {
    return { ok: false, errorKey: 'checkout.cod_not_available_for_zone' };
  }

  // Sprint 9: validate promo code (read-only preview). Actual consume is
  // inside the transaction so exhaust-mid-flight rolls the whole order back.
  const codeInput = parsed.data.promoCode?.trim() ?? '';
  let promoDiscount = 0;
  let promoCodeIdToConsume: string | null = null;
  if (codeInput.length > 0) {
    const r = await validatePromoCode(codeInput, subtotal);
    if (!r.ok) {
      return { ok: false, errorKey: `promo.${r.error}` };
    }
    promoDiscount = r.discountEgp;
    promoCodeIdToConsume = r.promoCode.id;
  }

  // Sprint 9: per-item VAT (only non-exempt products). Applied to the price
  // AFTER the promo-code discount so the reported VAT matches what the
  // customer actually paid. We prorate the promo discount per-line by line
  // total share so each item's taxable base is proportionally reduced.
  const vatRate = (await getVatRate()).percent;
  let vat = 0;
  if (subtotal > 0) {
    for (const i of items) {
      const unit = Number(i.unitPriceEgpSnapshot);
      const lineTotal = unit * i.qty;
      const promoShare =
        promoDiscount > 0 ? promoDiscount * (lineTotal / subtotal) : 0;
      const taxableLineTotal = Math.max(0, lineTotal - promoShare);
      vat += computeLineVat(
        taxableLineTotal / Math.max(1, i.qty),
        i.qty,
        i.product.vatExempt,
        vatRate,
      );
    }
  }
  vat = roundEgp(vat);

  const shipping = roundEgp(quote.shippingEgp);
  const codFee = roundEgp(quote.codFeeEgp);
  const discount = roundEgp(promoDiscount);
  const total = roundEgp(subtotal + shipping + codFee + vat - discount);

  const addressSnapshot = {
    recipientName: parsed.data.address.recipientName,
    phone: parsed.data.address.phone,
    governorate: parsed.data.address.governorate,
    city: parsed.data.address.city,
    area: toNullable(parsed.data.address.area),
    street: parsed.data.address.street,
    building: toNullable(parsed.data.address.building),
    apartment: toNullable(parsed.data.address.apartment),
    notes: toNullable(parsed.data.address.notes),
  };

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);
      const paymentMethod: PaymentMethod = parsed.data.paymentMethod;

      // Atomically consume promo code first so the order isn't created if
      // someone else just used the last slot.
      if (promoCodeIdToConsume) {
        const consumed = await tryConsumePromoCode(tx, promoCodeIdToConsume);
        if (!consumed) {
          throw new Error('promo.usage_limit_reached');
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.type === 'B2C' || user?.type === 'B2B' ? user.id : null,
          companyId: isB2BOrder ? b2bCtx!.companyId : null,
          type: isB2BOrder ? 'B2B' : 'B2C',
          contactName: parsed.data.contact.name,
          contactPhone: parsed.data.contact.phone,
          contactEmail: toNullable(parsed.data.contact.email),
          addressSnapshot: addressSnapshot as never,
          status: 'CONFIRMED',
          paymentMethod,
          paymentStatus:
            paymentMethod === 'COD' ? 'PENDING_ON_DELIVERY' : 'PENDING',
          subtotalEgp: subtotal,
          shippingEgp: shipping,
          codFeeEgp: codFee,
          discountEgp: discount,
          vatEgp: vat,
          totalEgp: total,
          promoCodeId: promoCodeIdToConsume,
          customerNotes: toNullable(parsed.data.customerNotes),
          placedByName: isB2BOrder
            ? toNullable(parsed.data.placedByName)
            : null,
          poReference: isB2BOrder ? toNullable(parsed.data.poReference) : null,
          confirmedAt: new Date(),
        },
      });

      await tx.orderItem.createMany({
        data: items.map((i) => ({
          orderId: order.id,
          productId: i.product.id,
          skuSnapshot: i.product.sku,
          nameArSnapshot: i.product.nameAr,
          nameEnSnapshot: i.product.nameEn,
          qty: i.qty,
          unitPriceEgp: i.unitPriceEgpSnapshot,
          lineTotalEgp: Number(i.unitPriceEgpSnapshot) * i.qty,
        })),
      });

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { id: true, productId: true, qty: true },
      });

      await tx.inventoryReservation.deleteMany({
        where: { refId: { in: reservationRefIds }, type: 'CART' },
      });
      await tx.inventoryReservation.createMany({
        data: orderItems
          .filter((oi) => oi.productId)
          .map((oi) => ({
            type: 'ORDER' as const,
            productId: oi.productId!,
            refId: oi.id,
            qty: oi.qty,
            expiresAt: null,
          })),
      });

      for (const oi of orderItems) {
        if (!oi.productId) continue;
        const { count } = await tx.inventory.updateMany({
          where: { productId: oi.productId, currentQty: { gte: oi.qty } },
          data: { currentQty: { decrement: oi.qty } },
        });
        if (count === 0) {
          throw new Error('cart.insufficient_stock');
        }
        await tx.inventoryMovement.create({
          data: {
            productId: oi.productId,
            type: 'SALE',
            qtyDelta: -oi.qty,
            refId: order.id,
            actorId: user?.id ?? null,
          },
        });
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'CONFIRMED',
          actorId: user?.id ?? null,
          note:
            paymentMethod === 'COD'
              ? 'COD placed'
              : paymentMethod === 'PAYMOB_FAWRY'
                ? 'Fawry checkout started'
                : 'Card checkout started',
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user?.id ?? null,
          action: 'order.create',
          entityType: 'Order',
          entityId: order.id,
          after: {
            orderNumber,
            paymentMethod,
            totalEgp: total,
            promoCodeId: promoCodeIdToConsume,
          } as never,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { order, orderNumber, paymentMethod };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cart.insufficient_stock') {
      return { ok: false, errorKey: 'cart.insufficient_stock' };
    }
    if (msg === 'promo.usage_limit_reached') {
      return { ok: false, errorKey: 'promo.usage_limit_reached' };
    }
    logger.error({ err: msg }, 'order.create.transaction_failed');
    return { ok: false, errorKey: 'order.create_failed' };
  }

  // Sprint 6 (ADR-034): Invoice row allocated on CONFIRMED; COD sends
  // immediately, Paymob waits for webhook PAID.
  try {
    const invoiceOutcome = await ensureInvoiceForOrder(
      result.order.id,
      user?.id ?? null,
    );
    if (
      invoiceOutcome.created &&
      result.paymentMethod === 'COD' &&
      invoiceOutcome.invoiceId
    ) {
      await sendInvoiceToCustomer(invoiceOutcome.invoiceId);
    }
  } catch (err) {
    logger.error(
      { err: (err as Error).message, orderId: result.order.id },
      'order.invoice.ensure_failed',
    );
  }

  if (
    result.paymentMethod === 'PAYMOB_CARD' ||
    result.paymentMethod === 'PAYMOB_FAWRY'
  ) {
    try {
      const [firstName, ...restParts] = parsed.data.contact.name.split(/\s+/);
      const lastName = restParts.join(' ') || firstName;
      const key = await createPaymentKey({
        merchantOrderId: result.order.id,
        amountCents: Math.round(total * 100),
        integrationKind:
          result.paymentMethod === 'PAYMOB_FAWRY' ? 'fawry' : 'card',
        items: items.map((i) => ({
          name: i.product.nameEn,
          amount_cents: Math.round(Number(i.unitPriceEgpSnapshot) * 100),
          description: i.product.sku,
          quantity: i.qty,
        })),
        billing: {
          firstName: firstName || 'Customer',
          lastName: lastName || 'Customer',
          phoneNumber: parsed.data.contact.phone,
          email:
            parsed.data.contact.email?.trim() || 'no-email@printbyfalcon.com',
          country: 'EG',
          city: parsed.data.address.city,
          street: parsed.data.address.street,
          apartment: parsed.data.address.apartment?.trim() || undefined,
          building: parsed.data.address.building?.trim() || undefined,
          state: parsed.data.address.governorate,
        },
      });
      await prisma.order.update({
        where: { id: result.order.id },
        data: { paymobOrderId: key.paymobOrderId },
      });
      revalidatePath('/', 'layout');
      return {
        ok: true,
        data: {
          orderId: result.order.id,
          orderNumber: result.orderNumber,
          paymentMethod: result.paymentMethod,
          redirectUrl: key.iframeUrl,
        },
      };
    } catch (err) {
      logger.error(
        { err: (err as Error).message, orderId: result.order.id },
        'order.paymob.payment_key_failed',
      );
      await prisma.order.update({
        where: { id: result.order.id },
        data: { paymentStatus: 'FAILED' },
      });
      return { ok: false, errorKey: 'order.payment_setup_failed' };
    }
  }

  // COD — send confirmation email immediately.
  if (parsed.data.contact.email?.trim()) {
    await enqueueOrderConfirmationEmail({
      to: parsed.data.contact.email.trim(),
      orderId: result.order.id,
      orderNumber: result.orderNumber,
      recipientName: parsed.data.contact.name,
      paymentMethod: result.paymentMethod,
      items: items.map((i) => ({
        nameAr: i.product.nameAr,
        nameEn: i.product.nameEn,
        sku: i.product.sku,
        qty: i.qty,
        lineTotalEgp: (Number(i.unitPriceEgpSnapshot) * i.qty).toFixed(2),
      })),
      subtotalEgp: subtotal.toFixed(2),
      shippingEgp: shipping.toFixed(2),
      codFeeEgp: codFee > 0 ? codFee.toFixed(2) : undefined,
      discountEgp: discount > 0 ? discount.toFixed(2) : undefined,
      vatEgp: vat > 0 ? vat.toFixed(2) : undefined,
      totalEgp: total.toFixed(2),
    });
  }
  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: {
      orderId: result.order.id,
      orderNumber: result.orderNumber,
      paymentMethod: result.paymentMethod,
      redirectUrl: `/order/confirmed/${result.order.id}`,
    },
  };
}

/**
 * Enqueue the localized order-confirmation email. Sprint 9 closes the
 * parked-item from Sprint 4: the same email is now also fired from the
 * Paymob webhook PAID branch so card customers get confirmation (not
 * just COD). Additional totals (COD fee, discount, VAT) render when
 * non-zero; zero-value lines are suppressed.
 */
export async function enqueueOrderConfirmationEmail(payload: {
  to: string;
  orderId: string;
  orderNumber: string;
  recipientName: string;
  paymentMethod: string;
  items: {
    nameAr: string;
    nameEn: string;
    sku: string;
    qty: number;
    lineTotalEgp: string;
  }[];
  subtotalEgp: string;
  shippingEgp: string;
  codFeeEgp?: string;
  discountEgp?: string;
  vatEgp?: string;
  totalEgp: string;
  locale?: 'ar' | 'en';
}) {
  const appUrl = (process.env.APP_URL ?? 'https://printbyfalcon.com').replace(
    /\/+$/,
    '',
  );
  const locale = payload.locale ?? 'ar';
  const rendered = renderOrderConfirmationEmail({
    locale,
    orderNumber: payload.orderNumber,
    recipientName: payload.recipientName,
    paymentMethod: payload.paymentMethod,
    items: payload.items,
    subtotalEgp: payload.subtotalEgp,
    shippingEgp: payload.shippingEgp,
    codFeeEgp: payload.codFeeEgp,
    discountEgp: payload.discountEgp,
    vatEgp: payload.vatEgp,
    totalEgp: payload.totalEgp,
    orderUrl: `${appUrl}/${locale}/order/confirmed/${payload.orderId}`,
  });
  try {
    await enqueueJob(
      'send-email',
      {
        to: payload.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      },
      { retryLimit: 3, retryDelay: 60, retryBackoff: true },
    );
  } catch (err) {
    logger.error(
      { err: (err as Error).message, orderId: payload.orderId },
      'order.email.enqueue_failed',
    );
  }
}

// ---------------------------------------------------------------------------
// Sprint 8 — B2B Submit-for-Review path.
// Sprint 9 extension: zone-based shipping, VAT, and promo code also apply to
// SFR orders. COD isn't offered on SFR (payment method = SUBMIT_FOR_REVIEW
// is terminal until the sales rep confirms with a concrete method).
// ---------------------------------------------------------------------------

const submitForReviewSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, 'validation.phone.invalid_eg'),
    email: z.string().trim().email().optional().or(z.literal('')),
  }),
  address: addressSchema,
  placedByName: z.string().trim().min(2).max(80),
  poReference: z.string().trim().max(40).optional().or(z.literal('')),
  customerNotes: z.string().trim().max(500).optional().or(z.literal('')),
  promoCode: z.string().trim().max(40).optional().or(z.literal('')),
});

export type SubmitForReviewInput = z.infer<typeof submitForReviewSchema>;

type SubmitForReviewSuccess = {
  orderId: string;
  orderNumber: string;
  redirectUrl: string;
};

export async function submitForReviewOrderAction(
  input: SubmitForReviewInput,
): Promise<ActionResult<SubmitForReviewSuccess>> {
  const parsed = submitForReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'validation.invalid' };
  }

  const b2bCtx = await getB2BCheckoutContext();
  if (!b2bCtx) return { ok: false, errorKey: 'checkout.b2b_required' };
  if (!b2bCtx.allowSubmitForReview) {
    return { ok: false, errorKey: 'checkout.submit_for_review_not_allowed' };
  }

  const cart = await getOrCreateCart();
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          nameAr: true,
          nameEn: true,
          basePriceEgp: true,
          vatExempt: true,
          status: true,
        },
      },
    },
  });
  if (items.length === 0) return { ok: false, errorKey: 'cart.empty' };
  const inactive = items.find((i) => i.product.status !== 'ACTIVE');
  if (inactive) return { ok: false, errorKey: 'cart.item_unavailable' };

  const reservationRefIds = items.map((i) => i.id);
  const availability = await getAvailableQtyMap(
    items.map((i) => i.product.id),
    reservationRefIds,
  );
  for (const i of items) {
    const avail = availability.get(i.product.id) ?? 0;
    if (avail < i.qty) {
      return { ok: false, errorKey: 'cart.insufficient_stock' };
    }
  }

  const subtotal = roundEgp(
    items.reduce((acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty, 0),
  );

  const quote = await resolveShippingQuote({
    governorate: parsed.data.address.governorate,
    subtotalEgp: subtotal,
    viewer: 'B2B',
  });
  if (quote.unknownZone) {
    return { ok: false, errorKey: 'checkout.zone_not_configured' };
  }

  const codeInput = parsed.data.promoCode?.trim() ?? '';
  let promoDiscount = 0;
  let promoCodeIdToConsume: string | null = null;
  if (codeInput.length > 0) {
    const r = await validatePromoCode(codeInput, subtotal);
    if (!r.ok) return { ok: false, errorKey: `promo.${r.error}` };
    promoDiscount = r.discountEgp;
    promoCodeIdToConsume = r.promoCode.id;
  }

  const vatRate = (await getVatRate()).percent;
  let vat = 0;
  if (subtotal > 0) {
    for (const i of items) {
      const unit = Number(i.unitPriceEgpSnapshot);
      const lineTotal = unit * i.qty;
      const promoShare =
        promoDiscount > 0 ? promoDiscount * (lineTotal / subtotal) : 0;
      const taxableLineTotal = Math.max(0, lineTotal - promoShare);
      vat += computeLineVat(
        taxableLineTotal / Math.max(1, i.qty),
        i.qty,
        i.product.vatExempt,
        vatRate,
      );
    }
  }
  vat = roundEgp(vat);

  const shipping = roundEgp(quote.shippingEgp);
  const discount = roundEgp(promoDiscount);
  const total = roundEgp(subtotal + shipping + vat - discount);

  const addressSnapshot = {
    recipientName: parsed.data.address.recipientName,
    phone: parsed.data.address.phone,
    governorate: parsed.data.address.governorate,
    city: parsed.data.address.city,
    area: toNullable(parsed.data.address.area),
    street: parsed.data.address.street,
    building: toNullable(parsed.data.address.building),
    apartment: toNullable(parsed.data.address.apartment),
    notes: toNullable(parsed.data.address.notes),
  };

  let result;
  try {
    result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orderNumber = await generateOrderNumber(tx);

      if (promoCodeIdToConsume) {
        const consumed = await tryConsumePromoCode(tx, promoCodeIdToConsume);
        if (!consumed) throw new Error('promo.usage_limit_reached');
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: b2bCtx.userId,
          companyId: b2bCtx.companyId,
          type: 'B2B',
          contactName: parsed.data.contact.name,
          contactPhone: parsed.data.contact.phone,
          contactEmail: toNullable(parsed.data.contact.email),
          addressSnapshot: addressSnapshot as never,
          status: 'PENDING_CONFIRMATION',
          paymentMethod: 'SUBMIT_FOR_REVIEW',
          paymentStatus: 'PENDING',
          subtotalEgp: subtotal,
          shippingEgp: shipping,
          codFeeEgp: 0,
          discountEgp: discount,
          vatEgp: vat,
          totalEgp: total,
          promoCodeId: promoCodeIdToConsume,
          customerNotes: toNullable(parsed.data.customerNotes),
          placedByName: parsed.data.placedByName,
          poReference: toNullable(parsed.data.poReference),
        },
      });

      await tx.orderItem.createMany({
        data: items.map((i) => ({
          orderId: order.id,
          productId: i.product.id,
          skuSnapshot: i.product.sku,
          nameArSnapshot: i.product.nameAr,
          nameEnSnapshot: i.product.nameEn,
          qty: i.qty,
          unitPriceEgp: i.unitPriceEgpSnapshot,
          lineTotalEgp: Number(i.unitPriceEgpSnapshot) * i.qty,
        })),
      });

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { id: true, productId: true, qty: true },
      });

      await tx.inventoryReservation.deleteMany({
        where: { refId: { in: reservationRefIds }, type: 'CART' },
      });
      await tx.inventoryReservation.createMany({
        data: orderItems
          .filter((oi) => oi.productId)
          .map((oi) => ({
            type: 'ORDER' as const,
            productId: oi.productId!,
            refId: oi.id,
            qty: oi.qty,
            expiresAt: null,
          })),
      });

      for (const oi of orderItems) {
        if (!oi.productId) continue;
        const { count } = await tx.inventory.updateMany({
          where: { productId: oi.productId, currentQty: { gte: oi.qty } },
          data: { currentQty: { decrement: oi.qty } },
        });
        if (count === 0) {
          throw new Error('cart.insufficient_stock');
        }
        await tx.inventoryMovement.create({
          data: {
            productId: oi.productId,
            type: 'SALE',
            qtyDelta: -oi.qty,
            refId: order.id,
            actorId: b2bCtx.userId,
          },
        });
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'PENDING_CONFIRMATION',
          actorId: b2bCtx.userId,
          note: 'B2B Submit-for-Review placed',
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: b2bCtx.userId,
          action: 'order.submit_for_review',
          entityType: 'Order',
          entityId: order.id,
          after: {
            orderNumber,
            totalEgp: total,
            companyId: b2bCtx.companyId,
            placedByName: parsed.data.placedByName,
            promoCodeId: promoCodeIdToConsume,
          } as never,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { order, orderNumber };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cart.insufficient_stock') {
      return { ok: false, errorKey: 'cart.insufficient_stock' };
    }
    if (msg === 'promo.usage_limit_reached') {
      return { ok: false, errorKey: 'promo.usage_limit_reached' };
    }
    logger.error({ err: msg }, 'order.submit_for_review.transaction_failed');
    return { ok: false, errorKey: 'order.create_failed' };
  }

  try {
    await enqueueJob('send-whatsapp', {
      phone: parsed.data.contact.phone,
      body: renderB2bPendingReview(
        {
          orderNumber: result.orderNumber,
          slaHours: B2B_SFR_SLA_HOURS,
        },
        'ar',
      ),
    });
  } catch (err) {
    logger.error(
      { err: (err as Error).message, orderId: result.order.id },
      'order.sfr.whatsapp_enqueue_failed',
    );
  }

  try {
    await notifySalesRepsOfPendingOrder({
      orderId: result.order.id,
      orderNumber: result.orderNumber,
      companyNameAr: b2bCtx.companyNameAr,
      companyNameEn: b2bCtx.companyNameEn,
      placedByName: parsed.data.placedByName,
      totalEgp: total,
    });
  } catch (err) {
    logger.error(
      { err: (err as Error).message, orderId: result.order.id },
      'order.sfr.sales_rep_notify_failed',
    );
  }

  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: {
      orderId: result.order.id,
      orderNumber: result.orderNumber,
      redirectUrl: `/order/confirmed/${result.order.id}`,
    },
  };
}
