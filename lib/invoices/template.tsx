/**
 * React-pdf Arabic invoice template (Sprint 6 S6-D4-T1).
 *
 * Arabic-only per PRD Feature 7 — no bilingual dual-column layout. SKU codes
 * are rendered LTR inside a span; numbers use Arabic-Indic digits? No — we
 * keep Latin digits for accounting compatibility (Egyptian tax forms use
 * Latin digits too, and accounting software OCRs them more reliably).
 *
 * Layout inputs are deterministic from the Order/OrderItem snapshots plus the
 * Invoice metadata row — see `buildInvoiceData()`. Because rendering is
 * deterministic, we can regenerate the same PDF bytes on-demand for every
 * download (ADR-034 — no files on disk).
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
  };
  customer: {
    name: string;
    phone: string;
    email: string | null;
    addressLine: string;
  };
  placedByName: string | null;
  lines: InvoiceLine[];
  subtotalEgp: number;
  discountEgp: number;
  shippingEgp: number;
  vatEgp: number;
  totalEgp: number;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
};

const COLORS = {
  ink: '#0F172A',
  muted: '#6B6B6B',
  paper: '#F3F1EC',
  border: '#E5E2DA',
  accent: '#0E7C86',
  amendedWatermark: 'rgba(181, 71, 71, 0.14)',
  amendedBorder: '#B54747',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: INVOICE_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.ink,
    padding: 40,
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  brand: { flexDirection: 'column' },
  brandName: { fontSize: 16, fontWeight: 700 },
  brandMeta: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  invoiceMeta: { flexDirection: 'column', alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 18, fontWeight: 700, color: COLORS.accent },
  invoiceNumber: { fontSize: 11, marginTop: 2 },
  invoiceDate: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  colBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: COLORS.paper,
  },
  colTitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 4,
  },
  colBody: { fontSize: 10 },
  amendedBanner: {
    marginTop: 8,
    marginBottom: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.amendedBorder,
    borderRadius: 4,
    color: COLORS.amendedBorder,
    fontSize: 10,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  th: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 6,
    fontSize: 10,
  },
  trLast: {
    flexDirection: 'row',
    padding: 6,
    fontSize: 10,
  },
  cellSku: { width: 80 },
  cellName: { flex: 1 },
  cellQty: { width: 40, textAlign: 'center' },
  cellPrice: { width: 70, textAlign: 'left' },
  cellTotal: { width: 70, textAlign: 'left' },
  totals: {
    alignSelf: 'flex-start',
    width: 240,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: COLORS.paper,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 10,
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 12,
    fontWeight: 700,
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

        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>{data.store.nameAr}</Text>
            <Text style={styles.brandMeta}>
              س.ت: {data.store.commercialRegistryNumber}
            </Text>
            <Text style={styles.brandMeta}>
              ب.ض: {data.store.taxCardNumber}
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
            <Text style={styles.invoiceTitle}>فاتورة</Text>
            <Text style={[styles.invoiceNumber, styles.ltr]}>
              {data.invoiceNumber}
            </Text>
            <Text style={styles.invoiceDate}>{formatDate(data.issuedAt)}</Text>
            <Text style={[styles.invoiceDate, styles.ltr]}>
              Order: {data.orderNumber}
            </Text>
          </View>
        </View>

        {data.isAmended ? (
          <Text style={styles.amendedBanner}>
            فاتورة معدَّلة — {data.amendmentReason ?? 'تعديل'}
          </Text>
        ) : null}

        <View style={styles.twoCol}>
          <View style={styles.colBox}>
            <Text style={styles.colTitle}>العميل</Text>
            <Text style={styles.colBody}>{data.customer.name}</Text>
            <Text style={[styles.colBody, styles.ltr]}>
              {data.customer.phone}
            </Text>
            {data.customer.email ? (
              <Text style={[styles.colBody, styles.ltr]}>
                {data.customer.email}
              </Text>
            ) : null}
            <Text style={styles.colBody}>{data.customer.addressLine}</Text>
            {data.placedByName ? (
              <Text style={[styles.colBody, { marginTop: 4 }]}>
                باسم: {data.placedByName}
              </Text>
            ) : null}
          </View>
          <View style={styles.colBox}>
            <Text style={styles.colTitle}>الدفع</Text>
            <Text style={styles.colBody}>
              الطريقة: {data.paymentMethodLabel}
            </Text>
            <Text style={styles.colBody}>
              الحالة: {data.paymentStatusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cellSku}>الكود</Text>
            <Text style={styles.cellName}>المنتج</Text>
            <Text style={styles.cellQty}>الكمية</Text>
            <Text style={styles.cellPrice}>السعر</Text>
            <Text style={styles.cellTotal}>الإجمالي</Text>
          </View>
          {data.lines.map((line, i) => {
            const isLast = i === data.lines.length - 1;
            return (
              <View
                key={`${line.sku}-${i}`}
                style={isLast ? styles.trLast : styles.tr}
              >
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

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>الإجمالي قبل الخصم</Text>
            <Text style={styles.ltr}>{money(data.subtotalEgp)}</Text>
          </View>
          {data.discountEgp > 0 ? (
            <View style={styles.totalsRow}>
              <Text>الخصم</Text>
              <Text style={styles.ltr}>- {money(data.discountEgp)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text>الشحن</Text>
            <Text style={styles.ltr}>{money(data.shippingEgp)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>ضريبة القيمة المضافة (14%)</Text>
            <Text style={styles.ltr}>{money(data.vatEgp)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text>الإجمالي</Text>
            <Text style={styles.ltr}>{money(data.totalEgp)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {data.store.nameAr} — {data.store.website} · {data.store.phone}
        </Text>
      </Page>
    </Document>
  );
}
