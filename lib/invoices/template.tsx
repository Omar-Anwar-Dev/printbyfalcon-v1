/**
 * React-pdf Arabic invoice template (Sprint 6 → Sprint 15 polish).
 *
 * Arabic-only per PRD Feature 7. Latin digits for accounting compatibility
 * (Egyptian tax forms + accounting software OCR more reliably).
 *
 * Sprint 15 polish — visual + wording (per ADR-067):
 *   - Title becomes "فاتورة ضريبية" (tax invoice — Egyptian compliance signal).
 *   - Accent strip at the top + bottom for brand recognition.
 *   - Clearer section labels ("بيانات العميل" / "بيانات الدفع").
 *   - Alternating row backgrounds (zebra) on the line-item table.
 *   - Grand-total row uses accent color for emphasis.
 *   - Footer carries thank-you line + return-policy reminder + page numbers.
 *   - Subtle font-size hierarchy (10pt body, 9pt meta, 8pt micro-copy).
 *
 * Layout inputs are deterministic from the Order/OrderItem snapshots plus the
 * Invoice metadata row — see `buildInvoiceData()`. Because rendering is
 * deterministic, we can regenerate the same PDF bytes on-demand for every
 * download (ADR-034 — no files on disk).
 */
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { INVOICE_FONT_FAMILY } from './fonts';

export type InvoiceLine = {
  sku: string;
  nameAr: string;
  qty: number;
  unitPriceEgp: number;
  lineTotalEgp: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date;
  isAmended: boolean;
  amendmentReason: string | null;
  store: {
    nameAr: string;
    commercialRegistryNumber: string;
    taxCardNumber: string;
    addressAr: string;
    phone: string;
    email: string;
    website: string;
    /** Brand logo filename under /storage/brand/ (Sprint 9 ADR-048). */
    logoFilename?: string | null;
    /** Decoded PNG buffer (WebP converted by builder) — null when no logo set. */
    logoPngBuffer?: Buffer | null;
  };
  customer: {
    name: string;
    phone: string;
    email: string | null;
    addressLine: string;
  };
  placedByName: string | null;
  poReference: string | null;
  paymentMethodNote: string | null;
  lines: InvoiceLine[];
  subtotalEgp: number;
  discountEgp: number;
  shippingEgp: number;
  vatEgp: number;
  totalEgp: number;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
};

// Aligned with docs/design-system.md v2 (ADR-059): pure-white body,
// neutral-gray panels, ink-cyan accent.
const COLORS = {
  ink: '#0F172A',
  inkSoft: '#1F2937',
  muted: '#666666',
  paper: '#F7F7F7',
  paperHover: '#F0F0F0',
  border: '#E5E5E5',
  accent: '#0A6B74',
  accentSoft: '#E6F3F4',
  white: '#FFFFFF',
  amendedWatermark: 'rgba(181, 71, 71, 0.14)',
  amendedBorder: '#B54747',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: INVOICE_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.ink,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 36,
    direction: 'rtl',
  },
  // Sprint 15 — accent strip across the top of every page (brand cue).
  accentStrip: {
    height: 6,
    backgroundColor: COLORS.accent,
    marginHorizontal: -36,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: { flexDirection: 'column', flex: 1 },
  brandName: {
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.ink,
  },
  brandTagline: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 1,
    fontStyle: 'italic',
  },
  brandMeta: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  invoiceMeta: { flexDirection: 'column', alignItems: 'flex-end', flex: 1 },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 4,
    color: COLORS.ink,
  },
  invoiceDate: { fontSize: 9, color: COLORS.muted, marginTop: 3 },
  // Sprint 15 — bordered section heading style for the two-col grid.
  sectionLabel: {
    fontSize: 8,
    color: COLORS.accent,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  colBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 11,
    backgroundColor: COLORS.paper,
  },
  colBody: { fontSize: 10, lineHeight: 1.4 },
  colLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginRight: 4,
  },
  amendedBanner: {
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.amendedBorder,
    borderRadius: 4,
    color: COLORS.amendedBorder,
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 14,
    overflow: 'hidden',
  },
  th: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    padding: 8,
    fontSize: 9,
    fontWeight: 700,
  },
  thText: { color: COLORS.white },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 7,
    fontSize: 10,
    backgroundColor: COLORS.white,
  },
  trAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 7,
    fontSize: 10,
    backgroundColor: COLORS.paper,
  },
  trLast: {
    flexDirection: 'row',
    padding: 7,
    fontSize: 10,
    backgroundColor: COLORS.white,
  },
  trLastAlt: {
    flexDirection: 'row',
    padding: 7,
    fontSize: 10,
    backgroundColor: COLORS.paper,
  },
  cellSku: { width: 80 },
  cellName: { flex: 1 },
  cellQty: { width: 40, textAlign: 'center' },
  cellPrice: { width: 75, textAlign: 'left' },
  cellTotal: { width: 75, textAlign: 'left', fontWeight: 700 },
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  totals: {
    width: 260,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: COLORS.paper,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10,
  },
  totalsLabel: { color: COLORS.muted },
  totalsValue: { color: COLORS.ink, fontWeight: 500 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.accent,
    fontSize: 13,
    fontWeight: 700,
  },
  grandLabel: { color: COLORS.ink },
  grandValue: { color: COLORS.accent },
  // Sprint 15 — thank-you + return-policy reminder above the page footer.
  noteBlock: {
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 4,
    backgroundColor: COLORS.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.accent,
    marginBottom: 3,
  },
  noteBody: {
    fontSize: 9,
    color: COLORS.inkSoft,
    lineHeight: 1.45,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  pageNum: {
    position: 'absolute',
    bottom: 24,
    right: 36,
    fontSize: 8,
    color: COLORS.muted,
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 72,
    fontWeight: 700,
    color: COLORS.amendedWatermark,
    transform: 'rotate(-30deg)',
  },
  ltr: { direction: 'ltr' },
  logo: {
    width: 64,
    height: 30,
    objectFit: 'contain',
    marginBottom: 5,
  },
});

function money(value: number): string {
  return `${value.toFixed(2)} EGP`;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author={data.store.nameAr}
      language="ar"
    >
      <Page size="A4" style={styles.page}>
        {/* Top accent strip — brand cue on every page. */}
        <View style={styles.accentStrip} fixed />

        {data.isAmended ? (
          <Text style={styles.watermark} fixed>
            AMENDED
          </Text>
        ) : null}

        {/* Header: brand block ↔ invoice metadata. */}
        <View style={styles.header}>
          <View style={styles.brand}>
            {data.store.logoPngBuffer ? (
              // react-pdf's Image has no alt prop; a11y linter doesn't apply in PDF output.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.store.logoPngBuffer} style={styles.logo} />
            ) : null}
            <Text style={styles.brandName}>{data.store.nameAr}</Text>
            <Text style={styles.brandTagline}>
              متجر متخصص في الطابعات وأحبار الطباعة
            </Text>
            <Text style={styles.brandMeta}>
              س.ت رقم: {data.store.commercialRegistryNumber}
            </Text>
            <Text style={styles.brandMeta}>
              ب.ض رقم: {data.store.taxCardNumber}
            </Text>
            <Text style={styles.brandMeta}>{data.store.addressAr}</Text>
            <Text style={[styles.brandMeta, styles.ltr]}>
              {data.store.phone}
            </Text>
            <Text style={[styles.brandMeta, styles.ltr]}>
              {data.store.website}
            </Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>فاتورة ضريبية</Text>
            <Text style={[styles.invoiceNumber, styles.ltr]}>
              {data.invoiceNumber}
            </Text>
            <Text style={styles.invoiceDate}>
              تاريخ الإصدار: {formatDate(data.issuedAt)}
            </Text>
            <Text style={[styles.invoiceDate, styles.ltr]}>
              Order: {data.orderNumber}
            </Text>
            {data.poReference ? (
              <Text style={[styles.invoiceDate, styles.ltr]}>
                PO Ref: {data.poReference}
              </Text>
            ) : null}
          </View>
        </View>

        {data.isAmended ? (
          <Text style={styles.amendedBanner}>
            فاتورة معدَّلة — {data.amendmentReason ?? 'تعديل'}
          </Text>
        ) : null}

        {/* Customer + Payment grid. */}
        <View style={styles.twoCol}>
          <View style={styles.colBox}>
            <Text style={styles.sectionLabel}>بيانات العميل</Text>
            <Text style={[styles.colBody, { fontWeight: 700 }]}>
              {data.customer.name}
            </Text>
            <Text style={[styles.colBody, styles.ltr, { marginTop: 2 }]}>
              {data.customer.phone}
            </Text>
            {data.customer.email ? (
              <Text style={[styles.colBody, styles.ltr]}>
                {data.customer.email}
              </Text>
            ) : null}
            <Text style={[styles.colBody, { marginTop: 4 }]}>
              {data.customer.addressLine}
            </Text>
            {data.placedByName ? (
              <Text style={[styles.colBody, { marginTop: 6 }]}>
                <Text style={styles.colLabel}>مقدم الطلب:</Text>{' '}
                {data.placedByName}
              </Text>
            ) : null}
          </View>
          <View style={styles.colBox}>
            <Text style={styles.sectionLabel}>بيانات الدفع</Text>
            <Text style={styles.colBody}>
              <Text style={styles.colLabel}>طريقة الدفع:</Text>{' '}
              {data.paymentMethodLabel}
            </Text>
            <Text style={[styles.colBody, { marginTop: 3 }]}>
              <Text style={styles.colLabel}>حالة الدفع:</Text>{' '}
              <Text style={{ fontWeight: 700 }}>{data.paymentStatusLabel}</Text>
            </Text>
            {data.paymentMethodNote ? (
              <Text style={[styles.colBody, { marginTop: 6 }]}>
                <Text style={styles.colLabel}>ملاحظة:</Text>{' '}
                {data.paymentMethodNote}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line-items table — accent header + zebra rows. */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.cellSku, styles.thText]}>كود المنتج</Text>
            <Text style={[styles.cellName, styles.thText]}>المنتج</Text>
            <Text style={[styles.cellQty, styles.thText]}>الكمية</Text>
            <Text style={[styles.cellPrice, styles.thText]}>سعر الوحدة</Text>
            <Text style={[styles.cellTotal, styles.thText]}>إجمالي البند</Text>
          </View>
          {data.lines.map((line, i) => {
            const isLast = i === data.lines.length - 1;
            const isAlt = i % 2 === 1;
            const rowStyle = isLast
              ? isAlt
                ? styles.trLastAlt
                : styles.trLast
              : isAlt
                ? styles.trAlt
                : styles.tr;
            return (
              <View key={`${line.sku}-${i}`} style={rowStyle}>
                <Text style={[styles.cellSku, styles.ltr]}>{line.sku}</Text>
                <Text style={styles.cellName}>{line.nameAr}</Text>
                <Text style={styles.cellQty}>{line.qty}</Text>
                <Text style={[styles.cellPrice, styles.ltr]}>
                  {money(line.unitPriceEgp)}
                </Text>
                <Text style={[styles.cellTotal, styles.ltr]}>
                  {money(line.lineTotalEgp)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals box — accent grand-total row. */}
        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>الإجمالي قبل الخصم</Text>
              <Text style={[styles.totalsValue, styles.ltr]}>
                {money(data.subtotalEgp)}
              </Text>
            </View>
            {data.discountEgp > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>الخصم</Text>
                <Text style={[styles.totalsValue, styles.ltr]}>
                  - {money(data.discountEgp)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>الشحن</Text>
              <Text style={[styles.totalsValue, styles.ltr]}>
                {money(data.shippingEgp)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>ضريبة القيمة المضافة (14%)</Text>
              <Text style={[styles.totalsValue, styles.ltr]}>
                {money(data.vatEgp)}
              </Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>الإجمالي المستحق</Text>
              <Text style={[styles.grandValue, styles.ltr]}>
                {money(data.totalEgp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Sprint 15 — thank-you + return-policy reminder. */}
        <View style={styles.noteBlock}>
          <Text style={styles.noteTitle}>
            شكرًا لاختياركم {data.store.nameAr}
          </Text>
          <Text style={styles.noteBody}>
            استرجاع المنتج متاح خلال 14 يومًا من تاريخ الاستلام في حالته
            الأصلية. للاستفسار أو الاسترجاع: تواصل معنا على{' '}
            <Text style={styles.ltr}>{data.store.phone}</Text> أو{' '}
            <Text style={styles.ltr}>{data.store.email}</Text>
          </Text>
        </View>

        {/* Footer — fixed across multi-page invoices. */}
        <Text style={styles.footer} fixed>
          {data.store.nameAr} · {data.store.website} ·{' '}
          <Text style={styles.ltr}>{data.store.phone}</Text>
        </Text>
        <Text
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) =>
            `صفحة ${pageNumber} من ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
