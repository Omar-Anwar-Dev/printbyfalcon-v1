/**
 * Invoice download route (Sprint 6 S6-D5-T1, ADR-034).
 *
 * The URL shape is `/invoices/<invoiceId>.pdf?t=<token>`. Per ADR-034 we
 * never persist PDFs to disk — every hit re-renders in-memory from the
 * immutable Order snapshot + current store info.
 *
 * Auth modes:
 *   1. Valid token from `buildInvoicePublicUrl()` — unauth access for the
 *      customer's email attachment URL + the Whats360 send-doc endpoint.
 *   2. Signed-in order owner (by `Order.userId === session.userId`).
 *   3. Signed-in admin (OWNER / OPS / SALES_REP) — re-download from admin UI.
 * Any path is sufficient; 404 otherwise.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { verifyInvoiceToken } from '@/lib/invoices/access-token';
import { renderInvoicePdf } from '@/lib/invoices/render';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const match = /^([a-z0-9]+)\.pdf$/i.exec(filename);
  if (!match) return new NextResponse('Not Found', { status: 404 });
  const invoiceId = match[1];

  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('t');

  // Auth path 1 — token.
  let authorised = !!tokenParam && verifyInvoiceToken(invoiceId, tokenParam);

  // Auth path 2/3 — session.
  if (!authorised) {
    const user = await getSessionUser();
    if (user) {
      if (user.type === 'ADMIN') {
        authorised = true;
      } else {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { order: { select: { userId: true } } },
        });
        if (invoice && invoice.order.userId === user.id) {
          authorised = true;
        }
      }
    }
  }

  if (!authorised) return new NextResponse('Not Found', { status: 404 });

  const buffer = await renderInvoicePdf(invoiceId);
  if (!buffer) return new NextResponse('Not Found', { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // inline so Whats360 can preview in the chat + browsers render in-page;
      // customer can still download via the ⋮ menu.
      'Content-Disposition': `inline; filename="${invoiceId}.pdf"`,
      // PDFs are deterministic per (invoiceId, store info state); a 5-minute
      // cache is enough to absorb an email-preview fan-out without holding
      // amendments back.
      'Cache-Control': 'private, max-age=300, must-revalidate',
    },
  });
}
