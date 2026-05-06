/**
 * Sprint 11.5 — Whats360 transport-mode helpers.
 *
 * Mode lives in `Setting whatsapp.transport` (JSON `{ mode: 'LIVE' | 'DEV' |
 * 'SANDBOX' }`). Read by `lib/whatsapp.ts` at request time so an admin
 * mode-flip takes effect on the next outbound send without a redeploy.
 *
 * - LIVE: real Whats360 API call against the configured device. Real
 *   messages, real billing.
 * - DEV: log-only (no HTTP call). Used to silence the channel during
 *   maintenance or while the device is being re-provisioned.
 * - SANDBOX: real HTTP call but with `&sandbox=true` so Whats360 returns a
 *   simulated success without billing or delivering. Useful for end-to-end
 *   testing without consuming the plan quota.
 *
 * The legacy `NOTIFICATIONS_DEV_MODE` env var still wins if set — that lets
 * a developer force log-only on their laptop without flipping the DB
 * setting. In production the env var is unset and the DB mode rules.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

export type WhatsappMode = 'LIVE' | 'DEV' | 'SANDBOX';

export const getWhatsappMode = cache(async (): Promise<WhatsappMode> => {
  // env-mode override (legacy + local dev)
  if (process.env.NOTIFICATIONS_DEV_MODE === 'true') return 'DEV';
  if (process.env.WHATS360_SANDBOX === 'true') return 'SANDBOX';

  const row = await prisma.setting.findUnique({
    where: { key: 'whatsapp.transport' },
    select: { value: true },
  });
  if (!row) return 'LIVE';
  const v = (row.value as { mode?: string } | null)?.mode;
  if (v === 'DEV' || v === 'SANDBOX' || v === 'LIVE') return v;
  return 'LIVE';
});

export async function setWhatsappMode(
  mode: WhatsappMode,
  actorId: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'whatsapp.transport' },
    update: { value: { mode } as never, updatedBy: actorId },
    create: {
      key: 'whatsapp.transport',
      value: { mode } as never,
      updatedBy: actorId,
    },
  });
}
