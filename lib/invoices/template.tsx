/**
 * React-pdf Arabic invoice template.
 *
 * Arabic-only per PRD Feature 7. Latin digits for accounting compatibility.
 *
 * Sprint 15 polish (with hotfix removing react-pdf-incompatible styles):
 *   - Title: "فاتورة ضريبية" (Egyptian tax-compliance signal).
 *   - Bigger, accented invoice header.
 *   - Clearer section labels ("بيانات العميل" / "بيانات الدفع").
 *   - Alternating row backgrounds (zebra) on the line-item table.
 *   - Accent-colored grand-total row.
 *   - Thank-you + return-policy callout above the page footer.
 *   - Page numbers in the footer.
 *
 * Hotfix removed (compatibility — react-pdf v4 + IBM Plex Arabic font):
 *   - textTransform: uppercase (didn't render on RTL strings reliably)
 *   - fontStyle: italic (Arabic font has no italic face)
 *   - letterSpacing on Arabic text (font hinting issue)
 *   - Negative-margin "accent strip" with fixed positioning (layout crash)
 *   - 3-level nested <Text> (replaced with flat template literals)
 *
 * Layout inputs are deterministic — see `buildInvoiceData()`. ADR-034
 * regenerates PDF on every download (no files on disk).
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
    padding: 40,
    paddingBottom: 60,
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
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
  },
  brandMeta: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  invoiceMeta: { flexDirection: 'column', alignItems: 'flex-end', flex: 1 },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.accent,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 4,
    color: COLORS.ink,
  },
  invoiceDate: { fontSize: 9, color: COLORS.muted, marginTop: 3 },
  sectionLabel: {
    fontSize: 9,
    color: COLORS.accent,
    marginBottom: 4,
    fontWeight: 700,
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
  colBodyBold: { fontSize: 10, lineHeight: 1.4, fontWeight: 700 },
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
  },
  th: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
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
    borderTopWidth: 2,
    borderTopColor: COLORS.accent,
    fontSize: 13,
    fontWeight: 700,
  },
  grandLabel: { color: COLORS.ink },
  grandValue: { color: COLORS.accent },
  noteBlock: {
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 4,
    backgroundColor: COLORS.accentSoft,
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
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  pageNum: {
    position: 'absolute',
    bottom: 30,
    right: 40,
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
              {`س.ت رقم: ${data.store.commercialRegistryNumber}`}
            </Text>
            <Text style={styles.brandMeta}>
              {`ب.ض رقم: ${data.store.taxCardNumber}`}
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
              {`تاريخ الإصدار: ${formatDate(data.issuedAt)}`}
            </Text>
            <Text style={[styles.invoiceDate, styles.ltr]}>
              {`Order: ${data.orderNumber}`}
            </Text>
            {data.poReference ? (
              <Text style={[styles.invoiceDate, styles.ltr]}>
                {`PO Ref: ${data.poReference}`}
              </Text>
            ) : null}
          </View>
        </View>

        {data.isAmended ? (
          <Text style={styles.amendedBanner}>
            {`فاتورة معدَّلة — ${data.amendmentReason ?? 'تعديل'}`}
          </Text>
        ) : null}

        {/* Customer + Payment grid. */}
        <View style={styles.twoCol}>
          <View style={styles.colBox}>
            <Text style={styles.sectionLabel}>بيانات العميل</Text>
            <Text style={styles.colBodyBold}>{data.customer.name}</Text>
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
                {`مقدم الطلب: ${data.placedByName}`}
              </Text>
            ) : null}
          </View>
          <View style={styles.colBox}>
            <Text style={styles.sectionLabel}>بيانات الدفع</Text>
            <Text style={styles.colBody}>
              {`طريقة الدفع: ${data.paymentMethodLabel}`}
            </Text>
            <Text style={[styles.colBodyBold, { marginTop: 3 }]}>
              {`حالة الدفع: ${data.paymentStatusLabel}`}
            </Text>
            {data.paymentMethodNote ? (
              <Text style={[styles.colBody, { marginTop: 6 }]}>
                {`ملاحظة: ${data.paymentMethodNote}`}
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
                  {`- ${money(data.discountEgp)}`}
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

        {/* Thank-you + return-policy reminder. */}
        <View style={styles.noteBlock}>
          <Text style={styles.noteTitle}>
            {`شكرًا لاختياركم ${data.store.nameAr}`}
          </Text>
          <Text style={styles.noteBody}>
            {`استرجاع المنتج متاح خلال 14 يومًا من تاريخ الاستلام في حالته الأصلية. للاستفسار أو الاسترجاع: تواصل معنا على ${data.store.phone} أو ${data.store.email}`}
          </Text>
        </View>

        {/* Footer + page numbers. */}
        <Text style={styles.footer} fixed>
          {`${data.store.nameAr} · ${data.store.website} · ${data.store.phone}`}
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
