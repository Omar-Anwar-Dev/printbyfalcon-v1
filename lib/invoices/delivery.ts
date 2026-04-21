/**
 * Invoice delivery (Sprint 6 S6-D5-T2).
 *
 * On CONFIRMED (and on subsequent amendments) the customer gets the invoice
 * via:
 *   - WhatsApp doc (Whats360 /send-doc) — pulls the PDF from our signed URL
 *   - Email attachment (B2B only per PRD Feature 5) — bytes attached
 *     in-memory; the SMTP worker never sees a file on disk (ADR-034)
 *
 * Failures don't throw up to the caller — logged + the Notification row
 * takes the outcome. Order creation shouldn't fail because the invoice send
 * glitched.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enqueueJob } from '@/lib/queue';
import { sendWhatsAppDoc } from '@/lib/whatsapp';
import { buildInvoicePublicUrl } from './access-token';
import { renderInvoicePdf } from './render';
import type { OrderType } from '@prisma/client';

function baseUrl(): string {
  return (
    process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com'
  );
}

export async function sendInvoiceToCustomer(
  invoiceId: string,
): Promise<{ whatsappQueued: boolean; emailQueued: boolean }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      order: {
        select: {
          id: true,
          type: true,
          contactEmail: true,
          contactPhone: true,
          contactName: true,
          orderNumber: true,
          userId: true,
        },
      },
    },
  });
  if (!invoice) return { whatsappQueued: false, emailQueued: false };

  const url = buildInvoicePublicUrl(baseUrl(), invoiceId);
  const caption = `فاتورة ${invoice.invoiceNumber} — طلب ${invoice.order.orderNumber}`;
  const filename = `${invoice.invoiceNumber}.pdf`;

  let whatsappQueued = false;
  if (invoice.order.contactPhone) {
    const notif = await prisma.notification.create({
      data: {
        userId: invoice.order.userId,
        channel: 'WHATSAPP',
        template: 'invoice.delivery',
        payload: { phone: invoice.order.contactPhone, url } as never,
        relatedOrderId: invoice.order.id,
        status: 'PENDING',
      },
    });
    try {
      const res = await sendWhatsAppDoc({
        phone: invoice.order.contactPhone,
        docUrl: url,
        filename,
        caption,
      });
      await prisma.notification.update({
        where: { id: notif.id },
        data: res.ok
          ? {
              status: 'SENT',
              externalMessageId: res.externalMessageId,
              sentAt: new Date(),
            }
          : {
              status: 'FAILED',
              errorMessage: res.error ?? 'send_doc failed',
            },
      });
      whatsappQueued = res.ok;
    } catch (err) {
      logger.error(
        { err: (err as Error).message, invoiceId },
        'invoice.delivery.whatsapp_exception',
      );
      await prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'FAILED', errorMessage: (err as Error).message },
      });
    }
  }

  // Email attachment — B2B only per PRD Feature 5.
  let emailQueued = false;
  if (
    invoice.order.type === ('B2B' as OrderType) &&
    invoice.order.contactEmail
  ) {
    try {
      const pdf = await renderInvoicePdf(invoice.id);
      if (pdf) {
        const b64 = pdf.toString('base64');
        await enqueueJob('send-email', {
          to: invoice.order.contactEmail,
          subject: `فاتورة ${invoice.invoiceNumber} — Print By Falcon`,
          text: `مرفق فاتورة طلبك ${invoice.order.orderNumber}.`,
          html: `<p>مرفق فاتورة طلبك <strong>${invoice.order.orderNumber}</strong>.</p><p>رابط الفاتورة: <a href="${url}">${url}</a></p>`,
          attachments: [
            {
              filename,
              contentBase64: b64,
              contentType: 'application/pdf',
            },
          ],
        });
        emailQueued = true;
      }
    } catch (err) {
      logger.error(
        { err: (err as Error).message, invoiceId },
        'invoice.delivery.email_exception',
      );
    }
  }

  return { whatsappQueued, emailQueued };
}
