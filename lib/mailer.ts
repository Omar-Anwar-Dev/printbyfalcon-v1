/**
 * Nodemailer-backed transactional email client. The worker calls `sendEmail`
 * indirectly via pg-boss jobs so retries + dead-letters come for free.
 *
 * Dev mode: if SMTP_PASS is empty, we log instead of sending so local dev
 * never accidentally hits real mailboxes.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '@/lib/logger';

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cached;
}

export type EmailAttachment = {
  filename: string;
  /** Base64-encoded bytes. Required because pg-boss payloads are JSON. */
  contentBase64: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transport = getTransport();
  const from = `"${process.env.SMTP_FROM_NAME ?? 'Print By Falcon'}" <${
    process.env.SMTP_FROM_EMAIL ?? 'noreply@printbyfalcon.com'
  }>`;

  if (!transport) {
    logger.warn(
      { to: input.to, subject: input.subject },
      'email.dev_mode.skipped',
    );
    return;
  }

  const attachments = input.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.contentBase64, 'base64'),
    contentType: a.contentType,
  }));

  const info = await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    attachments,
  });

  logger.info(
    { to: input.to, subject: input.subject, messageId: info.messageId },
    'email.sent',
  );
}

export async function verifyEmailTransport(): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;
  try {
    await transport.verify();
    return true;
  } catch (err) {
    logger.error({ err }, 'email.transport.verify_failed');
    return false;
  }
}
