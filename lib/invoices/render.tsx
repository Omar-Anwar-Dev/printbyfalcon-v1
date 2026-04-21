/**
 * Renders an Invoice row (+ its Order/OrderItem snapshots + store info) into
 * PDF bytes in-memory. Per ADR-034 we never persist the file — callers stream
 * the Buffer to the HTTP response, attach it to an email, or POST/GET it to
 * Whats360. Deterministic output from immutable snapshot columns means
 * legally-required invoice retention is satisfied by the Invoice row itself.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { buildInvoiceData } from './builder';
import { InvoiceDocument } from './template';
import { ensureFontsRegistered } from './fonts';

export async function renderInvoicePdf(
  invoiceId: string,
): Promise<Buffer | null> {
  ensureFontsRegistered();
  const data = await buildInvoiceData(invoiceId);
  if (!data) return null;
  return renderToBuffer(<InvoiceDocument data={data} />);
}
