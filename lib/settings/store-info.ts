/**
 * Store / company info for the invoice header (Sprint 6 kickoff decision #2).
 *
 * Placeholder values render immediately so invoices aren't blocked on paperwork;
 * owner swaps real CR#, tax card#, address, phone via `/admin/settings/store`
 * when those are finalized.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

const SETTING_KEY = 'store.info';

export type StoreInfo = {
  nameAr: string;
  nameEn: string;
  commercialRegistryNumber: string;
  taxCardNumber: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  email: string;
  website: string;
  /// Sprint 9: logo filename under /storage/brand/. Empty = invoices +
  /// site header render the store name only (no image).
  logoFilename: string;
  /// Sprint 9: support WhatsApp number (sales-team manual line — distinct
  /// from the Whats360 device used for OTP/notifications). Bridge deep-link
  /// target for the Sprint 10 "Chat with us" button. Closes PRD Q#2.
  supportWhatsapp: string;
};

export const STORE_INFO_DEFAULT: StoreInfo = {
  nameAr: 'برينت باي فالكون',
  nameEn: 'Print By Falcon',
  commercialRegistryNumber: 'TBD',
  taxCardNumber: 'TBD',
  addressAr: 'القاهرة، مصر',
  addressEn: 'Cairo, Egypt',
  phone: '—',
  email: 'info@printbyfalcon.com',
  website: 'printbyfalcon.com',
  logoFilename: '',
  supportWhatsapp: '',
};

export const getStoreInfo = cache(async (): Promise<StoreInfo> => {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
    select: { value: true },
  });
  if (!row?.value) return STORE_INFO_DEFAULT;
  const val = row.value as Partial<StoreInfo>;
  return { ...STORE_INFO_DEFAULT, ...val };
});

export async function setStoreInfo(
  value: StoreInfo,
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
