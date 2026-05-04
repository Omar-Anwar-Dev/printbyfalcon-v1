/**
 * Manual smoke test for invoice PDF rendering.
 *
 * Run: `npx tsx scripts/smoke-invoice-render.tsx`
 *
 * Renders a sample invoice with the specific Arabic words that broke under
 * Amiri 1.003 (Sprint 15 hotfix #3) and writes the output to
 * tmp/smoke-invoice.pdf. Open it to verify shaping is correct.
 *
 * Not part of the vitest suite because react-pdf + vitest's esbuild transform
 * have a known JSX-runtime mismatch. This standalone script runs through
 * tsx, which uses the same SWC pipeline as Next.js, so it matches what runs
 * in production.
 */
import * as React from 'react';
import path from 'node:path';
import fs from 'node:fs';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDocument, type InvoiceData } from '../lib/invoices/template';
import { ensureFontsRegistered } from '../lib/invoices/fonts';

const data: InvoiceData = {
  invoiceNumber: 'INV-26-SMOKE',
  orderNumber: 'ORD-26-SMOKE-00001',
  issuedAt: new Date('2026-05-04T10:00:00Z'),
  isAmended: false,
  amendmentReason: null,
  store: {
    nameAr: 'برينت باي فالكون',
    commercialRegistryNumber: '12345',
    taxCardNumber: '987-654-321',
    addressAr: 'القاهرة، مصر',
    phone: '01234567890',
    email: 'info@printbyfalcon.com',
    website: 'printbyfalcon.com',
    logoFilename: null,
    logoPngBuffer: null,
  },
  customer: {
    name: 'محمد أحمد على',
    phone: '01112345678',
    email: 'customer@example.com',
    addressLine: 'المعادي، القاهرة',
  },
  placedByName: 'لاختياركم بريت باي فالكون',
  poReference: 'PO-2026-001',
  paymentMethodNote: 'الكمية المطلوبة محسوبة على تاريخ التسليم',
  lines: [
    {
      sku: 'ACC-TONER-VACUUM',
      nameAr: 'مكنسة تنظيف الطابعات',
      qty: 1,
      unitPriceEgp: 3450,
      lineTotalEgp: 3450,
    },
    {
      sku: 'PRT-INK-CARTRIDGE-XXL',
      nameAr: 'خرطوشة حبر طابعة ملونة كمية كبيرة',
      qty: 2,
      unitPriceEgp: 1200,
      lineTotalEgp: 2400,
    },
  ],
  subtotalEgp: 5850,
  discountEgp: 0,
  shippingEgp: 0,
  vatEgp: 819,
  totalEgp: 6669,
  paymentMethodLabel: 'الدفع عند الاستلام',
  paymentStatusLabel: 'تحصيل عند الاستلام',
};

async function main() {
  ensureFontsRegistered();
  const buf = await renderToBuffer(<InvoiceDocument data={data} />);
  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `smoke-invoice-${Date.now()}.pdf`);
  fs.writeFileSync(out, buf);
  console.log(`✓ Wrote ${out} (${buf.length} bytes)`);
  console.log('  Open it and verify these words shape correctly:');
  console.log('  - تاريخ (in payment-method note)');
  console.log('  - الكمية (in payment-method note + product name)');
  console.log('  - لاختياركم (in placed-by + thank-you block)');
}

main().catch((err) => {
  console.error('✗ Render failed:', err);
  process.exit(1);
});
