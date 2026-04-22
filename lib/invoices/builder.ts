/**
 * Invoice data builder (Sprint 6 ADR-034).
 *
 * Pure projection from Order + OrderItem snapshots + Invoice metadata + store
 * info. The output `InvoiceData` is deterministic for a given invoiceId, which
 * is what makes on-demand re-rendering safe (no file on disk — we rebuild the
 * same bytes every request).
 */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { getStoreInfo } from '@/lib/settings/store-info';
import { brandAssetDiskPath } from '@/lib/storage/paths';
import { logger } from '@/lib/logger';
import type { InvoiceData, InvoiceLine } from './template';

/**
 * Sprint 10 — load the brand logo from disk + re-encode to PNG for react-pdf
 * (which doesn't support WebP natively). Returns null if no logo is set or
 * the file is missing — template skips the image block in that case.
 */
async function loadLogoAsPng(filename: string): Promise<Buffer | null> {
  if (!filename) return null;
  try {
    const webp = await readFile(brandAssetDiskPath(filename));
    return await sharp(webp).png().toBuffer();
  } catch (err) {
    logger.warn({ err, filename }, 'invoice.logo.load_failed');
    return null;
  }
}

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
      logoFilename: store.logoFilename || null,
      logoPngBuffer: await loadLogoAsPng(store.logoFilename),
    },
    customer: {
      name: order.contactName,
      phone: order.contactPhone,
      email: order.contactEmail ?? null,
      addressLine: addressSnapshotToLine(order.addressSnapshot),
    },
    // Sprint 8 S8-D3-T3: B2B attribution fields flow through from Order.
    placedByName: order.placedByName ?? null,
    poReference: order.poReference ?? null,
    paymentMethodNote: order.paymentMethodNote ?? null,
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
