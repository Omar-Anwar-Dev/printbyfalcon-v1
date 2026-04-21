/**
 * Bilingual labels for the 27 Egyptian governorates (Prisma `Governorate` enum).
 * Order follows the standard administrative listing used by Egyptian
 * government portals (CAPMAS) for familiarity with Arabic-speaking users.
 */
import { Governorate } from '@prisma/client';

type Entry = { value: Governorate; labelAr: string; labelEn: string };

export const GOVERNORATE_OPTIONS: readonly Entry[] = [
  { value: Governorate.CAIRO, labelAr: 'القاهرة', labelEn: 'Cairo' },
  { value: Governorate.GIZA, labelAr: 'الجيزة', labelEn: 'Giza' },
  { value: Governorate.QALYUBIA, labelAr: 'القليوبية', labelEn: 'Qalyubia' },
  {
    value: Governorate.ALEXANDRIA,
    labelAr: 'الإسكندرية',
    labelEn: 'Alexandria',
  },
  { value: Governorate.BEHEIRA, labelAr: 'البحيرة', labelEn: 'Beheira' },
  { value: Governorate.DAKAHLIA, labelAr: 'الدقهلية', labelEn: 'Dakahlia' },
  { value: Governorate.DAMIETTA, labelAr: 'دمياط', labelEn: 'Damietta' },
  { value: Governorate.GHARBIA, labelAr: 'الغربية', labelEn: 'Gharbia' },
  {
    value: Governorate.KAFR_EL_SHEIKH,
    labelAr: 'كفر الشيخ',
    labelEn: 'Kafr El Sheikh',
  },
  { value: Governorate.MENOUFIA, labelAr: 'المنوفية', labelEn: 'Menoufia' },
  { value: Governorate.SHARQIA, labelAr: 'الشرقية', labelEn: 'Sharqia' },
  { value: Governorate.ISMAILIA, labelAr: 'الإسماعيلية', labelEn: 'Ismailia' },
  { value: Governorate.PORT_SAID, labelAr: 'بورسعيد', labelEn: 'Port Said' },
  { value: Governorate.SUEZ, labelAr: 'السويس', labelEn: 'Suez' },
  {
    value: Governorate.NORTH_SINAI,
    labelAr: 'شمال سيناء',
    labelEn: 'North Sinai',
  },
  {
    value: Governorate.SOUTH_SINAI,
    labelAr: 'جنوب سيناء',
    labelEn: 'South Sinai',
  },
  { value: Governorate.RED_SEA, labelAr: 'البحر الأحمر', labelEn: 'Red Sea' },
  { value: Governorate.MATRUH, labelAr: 'مطروح', labelEn: 'Matrouh' },
  {
    value: Governorate.NEW_VALLEY,
    labelAr: 'الوادي الجديد',
    labelEn: 'New Valley',
  },
  { value: Governorate.BENI_SUEF, labelAr: 'بني سويف', labelEn: 'Beni Suef' },
  { value: Governorate.FAYOUM, labelAr: 'الفيوم', labelEn: 'Fayoum' },
  { value: Governorate.MINYA, labelAr: 'المنيا', labelEn: 'Minya' },
  { value: Governorate.ASYUT, labelAr: 'أسيوط', labelEn: 'Asyut' },
  { value: Governorate.SOHAG, labelAr: 'سوهاج', labelEn: 'Sohag' },
  { value: Governorate.QENA, labelAr: 'قنا', labelEn: 'Qena' },
  { value: Governorate.LUXOR, labelAr: 'الأقصر', labelEn: 'Luxor' },
  { value: Governorate.ASWAN, labelAr: 'أسوان', labelEn: 'Aswan' },
];

const lookup = new Map(GOVERNORATE_OPTIONS.map((g) => [g.value, g] as const));

export function governorateLabel(
  value: Governorate | string,
  locale: 'ar' | 'en',
): string {
  const entry = lookup.get(value as Governorate);
  if (!entry) return String(value);
  return locale === 'ar' ? entry.labelAr : entry.labelEn;
}
