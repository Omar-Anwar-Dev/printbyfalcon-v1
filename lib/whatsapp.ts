/**
 * Whats360 WhatsApp transport (ADR-033) — replaces the Meta Cloud API integration.
 *
 * All outbound WhatsApp flows through sendWhatsApp: OTP, order-status changes,
 * B2B submit-for-review acknowledgement, payment-failed alerts. Text is composed
 * server-side in lib/whatsapp-templates.ts; no Meta template pre-approval.
 *
 * Dev mode: `NOTIFICATIONS_DEV_MODE=true` OR missing credentials → log-only.
 * Sandbox mode: `WHATS360_SANDBOX=true` appends &sandbox=true to every send
 * (exercises the API path without billing a real message — used in CI).
 */
import { logger } from '@/lib/logger';

const DEFAULT_BASE_URL = 'https://whats360.live';

export type WhatsAppSend = {
  phone: string;
  body: string;
  /**
   * Optional Notification row id; when set, the worker updates that row's
   * status (PENDING → SENT / FAILED) after the HTTP call settles. Keeps the
   * send-pipeline receipt without the Server Action having to wait on pg-boss.
   */
  notificationId?: string;
};

export type WhatsAppSendResult = {
  ok: boolean;
  externalMessageId?: string;
  error?: string;
};

export async function sendWhatsApp(
  payload: WhatsAppSend,
): Promise<WhatsAppSendResult> {
  const devMode = process.env.NOTIFICATIONS_DEV_MODE === 'true';
  const token = process.env.WHATS360_TOKEN;
  const instanceId = process.env.WHATS360_INSTANCE_ID;
  const baseUrl = process.env.WHATS360_BASE_URL ?? DEFAULT_BASE_URL;
  const sandbox = process.env.WHATS360_SANDBOX === 'true';

  if (devMode || !token || !instanceId) {
    logger.warn(
      {
        to: maskPhone(payload.phone),
        bodyPreview: payload.body.slice(0, 80),
        devMode,
        reason: devMode
          ? 'NOTIFICATIONS_DEV_MODE'
          : 'missing WHATS360_TOKEN or WHATS360_INSTANCE_ID',
      },
      'whatsapp.dev_mode.send',
    );
    return { ok: true, externalMessageId: `dev-${Date.now()}` };
  }

  const jid = normalizeJid(payload.phone);
  if (!jid) {
    return { ok: false, error: 'invalid_phone_format' };
  }

  const params = new URLSearchParams({
    token,
    instance_id: instanceId,
    jid,
    msg: payload.body,
  });
  if (sandbox) params.set('sandbox', 'true');

  const url = `${baseUrl}/api/v1/send-text?${params.toString()}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      response?: { key?: { id?: string } };
      error?: string;
    };

    if (!res.ok || json.success === false) {
      const err = json.error ?? json.message ?? `HTTP ${res.status}`;
      logger.error(
        { status: res.status, error: err, to: maskPhone(payload.phone) },
        'whatsapp.send.failed',
      );
      return { ok: false, error: err };
    }

    const externalMessageId = json.response?.key?.id ?? `w360-${Date.now()}`;
    return { ok: true, externalMessageId };
  } catch (err) {
    logger.error(
      { err, to: maskPhone(payload.phone) },
      'whatsapp.send.exception',
    );
    return { ok: false, error: (err as Error).message };
  }
}

export type Whats360DeviceStatus = {
  connected: boolean;
  raw?: unknown;
  error?: string;
};

export async function getDeviceStatus(): Promise<Whats360DeviceStatus> {
  const token = process.env.WHATS360_TOKEN;
  const instanceId = process.env.WHATS360_INSTANCE_ID;
  const baseUrl = process.env.WHATS360_BASE_URL ?? DEFAULT_BASE_URL;

  if (!token || !instanceId) {
    return { connected: false, error: 'missing_config' };
  }

  const url = `${baseUrl}/api/v1/instances/status?token=${encodeURIComponent(
    token,
  )}&instance_id=${encodeURIComponent(instanceId)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      response?: { connected?: boolean; status?: string };
      error?: string;
    };
    if (!res.ok || json.success === false) {
      return {
        connected: false,
        error: json.error ?? `HTTP ${res.status}`,
        raw: json,
      };
    }
    const connected =
      json.response?.connected === true ||
      json.response?.status === 'connected' ||
      json.response?.status === 'authenticated';
    return { connected, raw: json };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

/**
 * Normalize an Egyptian phone number to Whats360's JID format.
 * Accepts `+201012345678`, `201012345678`, `01012345678`, `1012345678`, with any
 * whitespace or dashes. Defaults the country code to Egypt (20).
 */
export function normalizeJid(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('20')) {
    national = national.slice(2);
  }
  national = national.replace(/^0+/, '');

  if (national.length < 9 || national.length > 11) return null;

  return `20${national}@s.whatsapp.net`;
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
