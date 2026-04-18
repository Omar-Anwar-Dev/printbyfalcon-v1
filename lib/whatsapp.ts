/**
 * WhatsApp Cloud API client — minimal. Dev mode short-circuits to console logging,
 * so auth flows work end-to-end before Meta approves the message templates.
 *
 * Real Meta template sends arrive in Sprint 5 once `auth_otp_ar` is approved.
 */
import { logger } from '@/lib/logger';

const CLOUD_API_VERSION = 'v21.0';

export type WhatsAppTemplateSend = {
  to: string; // E.164 without '+'
  template: string;
  languageCode: 'ar' | 'en';
  // 6-digit code for auth_otp_ar; other templates will arrive in later sprints
  bodyParams?: string[];
  buttonParam?: string;
};

export async function sendWhatsAppTemplate(
  payload: WhatsAppTemplateSend,
): Promise<{ ok: boolean; externalMessageId?: string; error?: string }> {
  const devMode = process.env.OTP_DEV_MODE === 'true';
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (devMode || !token || !phoneNumberId) {
    logger.warn(
      {
        template: payload.template,
        to: maskPhone(payload.to),
        bodyParams: payload.bodyParams,
        devMode,
      },
      'whatsapp.dev_mode.send',
    );
    return { ok: true, externalMessageId: `dev-${Date.now()}` };
  }

  const url = `https://graph.facebook.com/${CLOUD_API_VERSION}/${phoneNumberId}/messages`;

  const components: unknown[] = [];
  if (payload.bodyParams?.length) {
    components.push({
      type: 'body',
      parameters: payload.bodyParams.map((text) => ({ type: 'text', text })),
    });
  }
  if (payload.buttonParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: payload.buttonParam }],
    });
  }

  const body = {
    messaging_product: 'whatsapp',
    to: payload.to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: payload.template,
      language: { code: payload.languageCode },
      components: components.length ? components : undefined,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };
    if (!res.ok || json.error) {
      logger.error(
        { status: res.status, error: json.error, template: payload.template },
        'whatsapp.send.failed',
      );
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, externalMessageId: json.messages?.[0]?.id };
  } catch (err) {
    logger.error({ err, template: payload.template }, 'whatsapp.send.exception');
    return { ok: false, error: (err as Error).message };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
