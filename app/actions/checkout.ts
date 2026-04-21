'use server';

/**
 * Checkout — createOrder Server Action.
 *
 * Transaction shape:
 *  1. Validate payload (zod).
 *  2. Re-check stock for every line item against Inventory + active
 *     reservations (excluding the caller's own CART reservations — those
 *     are about to become ORDER reservations).
 *  3. Inside a single DB transaction:
 *       a. Allocate order number via OrderDailySequence.
 *       b. Create Order + OrderItem rows.
 *       c. Delete CART reservations for this cart's items.
 *       d. Create ORDER reservations (expiresAt=null; firm hold).
 *       e. Decrement Inventory.currentQty per item.
 *       f. Insert InventoryMovement(type=SALE) per item.
 *       g. Insert OrderStatusEvent(status=CONFIRMED).
 *       h. AuditLog entry.
 *       i. Empty the cart.
 *  4. For Paymob card: call Paymob API → return iframeUrl for redirect.
 *  5. For COD: return internal confirmation URL.
 *
 * The cart can represent either a signed-in B2C user or a guest; in either
 * case we accept inline contact fields (name/phone/email) and address fields
 * so guest checkout needs zero Account rows.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Governorate, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { getOrCreateCart } from '@/lib/cart/cart';
import { getAvailableQtyMap } from '@/lib/cart/stock';
import { generateOrderNumber } from '@/lib/order/order-number';
import { createPaymentKey } from '@/lib/payments/paymob';
import { enqueueJob } from '@/lib/queue';
import { renderOrderConfirmationEmail } from '@/lib/email/order-confirmation';
import { ensureInvoiceForOrder } from '@/lib/invoices/ensure';
import { sendInvoiceToCustomer } from '@/lib/invoices/delivery';
import { logger } from '@/lib/logger';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: Record<string, string>;
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const checkoutSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, 'validation.phone.invalid_eg'),
    email: z.string().trim().email().optional().or(z.literal('')),
  }),
  address: z.object({
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
  }),
  paymentMethod: z.enum(['PAYMOB_CARD', 'COD']),
  customerNotes: z.string().trim().max(500).optional().or(z.literal('')),
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

export async function createOrderAction(
  input: CheckoutInput,
): Promise<ActionResult<CreateOrderSuccess>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'validation.invalid' };
  }

  const user = await getOptionalUser();
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

  // Re-validate stock excluding the caller's own CART reservations (about to
  // be converted into ORDER reservations).
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

  // Totals. VAT isn't charged until §9 shipping/settings lands; Sprint 4
  // totals subtotal straight into total, shipping=0, VAT=0. Sprint 9 wires
  // zone-based shipping + 14% VAT breakout per PRD §5 Feature 3.
  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty,
    0,
  );
  const shipping = 0;
  const discount = 0;
  const vat = 0;
  const total = subtotal + shipping - discount + vat;

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

      // For COD, mark the order Confirmed with payment_status=PENDING_ON_DELIVERY.
      // For Paymob card, mark Confirmed (stock reserved) with payment_status=PENDING;
      // the webhook flips to PAID.
      const paymentMethod: PaymentMethod =
        parsed.data.paymentMethod === 'COD' ? 'COD' : 'PAYMOB_CARD';

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.type === 'B2C' ? user.id : null,
          type: 'B2C',
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
          discountEgp: discount,
          vatEgp: vat,
          totalEgp: total,
          customerNotes: toNullable(parsed.data.customerNotes),
          confirmedAt: new Date(),
        },
      });

      // Snapshotted order items.
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

      // Convert CART reservations → ORDER reservations (firm, no expiresAt).
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

      // Decrement inventory + log movements — race-safe (S6-D7-T2):
      // `updateMany` with `currentQty >= qty` predicate only applies when
      // there's enough stock. If count === 0 we raced another checkout for the
      // last unit; throw to rollback the whole transaction.
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

      // OrderStatusEvent + AuditLog.
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'CONFIRMED',
          actorId: user?.id ?? null,
          note:
            paymentMethod === 'COD' ? 'COD placed' : 'Card checkout started',
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
          } as never,
        },
      });

      // Empty the cart — items + any stray reservations for it.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { order, orderNumber, paymentMethod };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cart.insufficient_stock') {
      return { ok: false, errorKey: 'cart.insufficient_stock' };
    }
    logger.error({ err: msg }, 'order.create.transaction_failed');
    return { ok: false, errorKey: 'order.create_failed' };
  }

  // Sprint 6 (ADR-034): Invoice row allocated on CONFIRMED. No file on disk —
  // PDF rendered on-demand from Order snapshot. Best-effort: invoice row
  // failure shouldn't block order placement (we can back-fill later).
  // COD sends immediately; PAYMOB_CARD waits for webhook PAID so the customer
  // isn't handed an invoice for a payment that never lands.
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

  // For Paymob card, call out to their API for a payment key. If that fails,
  // we keep the order but mark it FAILED so the customer can retry.
  if (result.paymentMethod === 'PAYMOB_CARD') {
    try {
      const [firstName, ...restParts] = parsed.data.contact.name.split(/\s+/);
      const lastName = restParts.join(' ') || firstName;
      const key = await createPaymentKey({
        merchantOrderId: result.order.id,
        amountCents: Math.round(total * 100),
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

  // COD — no external hop; send confirmation email immediately and land on
  // our confirmation page.
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
 * Enqueue the localized order-confirmation email. Defaults to Arabic (primary
 * user-facing locale); callers can override via `locale` once per-user locale
 * resolution is wired.
 */
async function enqueueOrderConfirmationEmail(payload: {
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

export { enqueueOrderConfirmationEmail };
