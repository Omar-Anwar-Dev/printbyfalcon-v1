/**
 * Notification opt-out settings (Sprint 5 S5-D6-T2).
 *
 * Backed by the generic `Setting` key/JSON-value store (arch §5.10). One key
 * holds the whole opt-out matrix; reads are cached per-request via
 * `React.cache` so a single status update only hits the DB once.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { NotificationChannel, OrderStatus, Prisma } from '@prisma/client';

const SETTING_KEY = 'notifications.optout';

export type NotificationOptOut = {
  WHATSAPP: OrderStatus[];
  EMAIL: OrderStatus[];
};

const EMPTY: NotificationOptOut = { WHATSAPP: [], EMAIL: [] };

export const getNotificationOptOut = cache(
  async (): Promise<NotificationOptOut> => {
    const row = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    });
    if (!row?.value) return EMPTY;
    const val = row.value as Prisma.JsonObject;
    return {
      WHATSAPP: Array.isArray(val.WHATSAPP)
        ? (val.WHATSAPP as OrderStatus[])
        : [],
      EMAIL: Array.isArray(val.EMAIL) ? (val.EMAIL as OrderStatus[]) : [],
    };
  },
);

/** Returns true when admin has disabled this channel × status pair. */
export async function isNotificationOptedOut(
  channel: NotificationChannel,
  status: OrderStatus,
): Promise<boolean> {
  const optout = await getNotificationOptOut();
  return optout[channel].includes(status);
}

export async function setNotificationOptOut(
  value: NotificationOptOut,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: {
      key: SETTING_KEY,
      value: value as never,
      updatedBy,
    },
    update: {
      value: value as never,
      updatedBy,
    },
  });
}
