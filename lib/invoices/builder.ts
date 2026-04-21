/**
 * Invoice data builder (Sprint 6 ADR-034).
 *
 * Pure projection from Order + OrderItem snapshots + Invoice metadata + store
 * info. The output `InvoiceData` is deterministic for a given invoiceId, which
 * is what makes on-demand re-rendering safe (no file on disk — we rebuild the
 * same bytes every request).
 */
import { prisma } from '@/lib/db';
import { getStoreInfo } from '@/lib/settings/store-info';
import type { InvoiceData, InvoiceLine } from './template';

const PAYMENT_METHOD_AR: Record<string, string> = {
  PAYMOB_CARD: 'بطاقة ائتمان (باي موب)',
  PAYMOB_FAWRY: 'فوري/أمان',
  COD: 'الدفع عند الاستلام',
  SUBMIT_FOR_REVIEW: 'بعد مراجعة المندوب',
};
const PAYMENT_STATUS_AR: Record<string, string> = {
  PENDING: 'قيد المعالجة',
  PAID: 'مدفوعة',
  FAILED: 'فشل الدفع',
  REFUNDED: 'مستردة',
  PENDING_ON_DELIVERY: 'تحصيل عند الاستلام',
};

function addressSnapshotToLine(snap: unknown): string {
  if (!snap || typeof snap !== 'object') return '';
  const a = snap as Record<string, unknown>;
  const pieces = [
    a.building ? String(a.building) : null,
    a.street ? String(a.street) : null,
    a.area ? String(a.area) : null,
    a.city ? String(a.city) : null,
    a.governorate ? String(a.governorate) : null,
  ].filter(Boolean);
  return pieces.join('، ');
}

export async function buildInvoiceData(
  invoiceId: string,
): Promise<InvoiceData | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });
  if (!invoice) return null;

  const store = await getStoreInfo();
  const order = invoice.order;

  const lines: InvoiceLine[] = order.items.map((it) => ({
    sku: it.skuSnapshot,
    nameAr: it.nameArSnapshot,
    qty: it.qty,
    unitPriceEgp: Number(it.unitPriceEgp),
    lineTotalEgp: Number(it.lineTotalEgp),
  }));

  return {
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: order.orderNumber,
    issuedAt: invoice.generatedAt,
    isAmended: invoice.isAmended,
    amendmentReason: invoice.amendmentReason,
    store: {
      nameAr: store.nameAr,
      commercialRegistryNumber: store.commercialRegistryNumber,
      taxCardNumber: store.taxCardNumber,
      addressAr: store.addressAr,
      phone: store.phone,
      email: store.email,
      website: store.website,
    },
    customer: {
      name: order.contactName,
      phone: order.contactPhone,
      email: order.contactEmail ?? null,
      addressLine: addressSnapshotToLine(order.addressSnapshot),
    },
    placedByName: null, // populated in Sprint 8 when B2B `placed_by_name` lands
    lines,
    subtotalEgp: Number(order.subtotalEgp),
    discountEgp: Number(order.discountEgp),
    shippingEgp: Number(order.shippingEgp),
    vatEgp: Number(order.vatEgp),
    totalEgp: Number(order.totalEgp),
    paymentMethodLabel:
      PAYMENT_METHOD_AR[order.paymentMethod] ?? order.paymentMethod,
    paymentStatusLabel:
      PAYMENT_STATUS_AR[order.paymentStatus] ?? order.paymentStatus,
  };
}
