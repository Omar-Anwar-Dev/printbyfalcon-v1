/**
 * Central i18n config. Kept deliberately small — `ar` is default, `en` second.
 * URL scheme: /ar/* (default, rewritten to bare /) and /en/* (explicit prefix).
 */

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ar';

export const localeDir: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
};

export const localeLabel: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
};
