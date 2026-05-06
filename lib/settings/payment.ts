/**
 * Sprint 11.5 — Payment-method + payment-mode helpers.
 *
 * Source of truth = `PaymentMethodConfig` table (admin-toggled visibility +
 * labels) + `Setting payment.mode` (LIVE / TEST runtime switch). Secrets
 * stay in env vars (per ADR-056); this module just controls which methods
 * appear at checkout and which env-var pair the Paymob lib reads from.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

export type PaymentMode = 'LIVE' | 'TEST';

export type PaymentMethodView = {
  code: string;
  enabled: boolean;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  position: number;
  paymobIntegrationKind: 'card' | 'fawry' | 'wallet' | null;
};

/** All payment methods (enabled + disabled) — admin UI uses this. */
export const getAllPaymentMethods = cache(
  async (): Promise<PaymentMethodView[]> => {
    const rows = await prisma.paymentMethodConfig.findMany({
      orderBy: { position: 'asc' },
    });
    return rows.map(toView);
  },
);

/** Only enabled methods — checkout UI uses this. */
export const getEnabledPaymentMethods = cache(
  async (): Promise<PaymentMethodView[]> => {
    const rows = await prisma.paymentMethodConfig.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });
    return rows.map(toView);
  },
);

/** Single-method lookup — used by checkout server actions to validate. */
export async function getPaymentMethod(
  code: string,
): Promise<PaymentMethodView | null> {
  const row = await prisma.paymentMethodConfig.findUnique({ where: { code } });
  return row ? toView(row) : null;
}

/** Read the current mode from settings. Defaults to LIVE if missing. */
export const getPaymentMode = cache(async (): Promise<PaymentMode> => {
  const row = await prisma.setting.findUnique({
    where: { key: 'payment.mode' },
    select: { value: true },
  });
  if (!row) return 'LIVE';
  const v = (row.value as { mode?: string } | null)?.mode;
  return v === 'TEST' ? 'TEST' : 'LIVE';
});

export async function setPaymentMode(
  mode: PaymentMode,
  actorId: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'payment.mode' },
    update: { value: { mode } as never, updatedBy: actorId },
    create: {
      key: 'payment.mode',
      value: { mode } as never,
      updatedBy: actorId,
    },
  });
}

function toView(row: {
  code: string;
  enabled: boolean;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  position: number;
  paymobIntegrationKind: string | null;
}): PaymentMethodView {
  return {
    code: row.code,
    enabled: row.enabled,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    position: row.position,
    paymobIntegrationKind:
      row.paymobIntegrationKind === 'card' ||
      row.paymobIntegrationKind === 'fawry' ||
      row.paymobIntegrationKind === 'wallet'
        ? row.paymobIntegrationKind
        : null,
  };
}
