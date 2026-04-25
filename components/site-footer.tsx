import { getLocale, getTranslations } from 'next-intl/server';
import {
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { BrandMark } from '@/components/brand-mark';

const STORE_ADDRESS_AR = '12 محمد صدقي باشا، باب اللوق، القاهرة';
const STORE_ADDRESS_EN = '12 Mohamed Sedky Pasha, Bab Al-Louk, Cairo';
const STORE_MAPS_URL = 'https://maps.app.goo.gl/6gNmycfpDtsWkGgs8';
const SUPPORT_EMAIL = 'support@printbyfalcon.com';
const WHATSAPP_NUMBER = '+20 111 652 7773';
const WHATSAPP_URL = 'https://wa.me/201116527773';

/**
 * Compact footer (post pre-M1 polish round 2).
 *
 * Two-column upper block (brand+contact / Account links), then a single
 * combined flex-wrap row for payment methods + legal links, then a slim
 * copyright strip. Total vertical footprint roughly half what the four-row
 * version was.
 */
export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const year = new Date().getFullYear();

  const accountLinks = [
    { href: '/account', label: t('nav.account') },
    {
      href: '/account/addresses',
      label: isAr ? 'العناوين' : 'Addresses',
    },
    {
      href: '/b2b/login',
      label: isAr ? 'حساب شركات' : 'Business login',
    },
    {
      href: '/b2b/register',
      label: isAr ? 'تسجيل حساب شركة' : 'Register a business',
    },
  ];

  const supportLinks = [
    {
      href: '/privacy',
      label: isAr ? 'سياسة الخصوصية' : 'Privacy policy',
    },
    {
      href: '/terms',
      label: isAr ? 'شروط الاستخدام' : 'Terms of service',
    },
    {
      href: '/cookies',
      label: isAr ? 'ملفات تعريف الارتباط' : 'Cookie policy',
    },
  ];

  const paymentMethods = [
    'Visa',
    'Mastercard',
    'Meeza',
    'Fawry',
    isAr ? 'الدفع عند الاستلام' : 'COD',
  ];

  return (
    <footer className="mt-16 bg-ink text-canvas">
      <div className="container-page pb-6 pt-10">
        {/* Top block — brand + account */}
        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-base font-bold">
              <BrandMark size={32} />
              {t('brand.name')}
            </div>
            <p className="max-w-md text-sm text-canvas/70">
              {t('brand.tagline')}
            </p>
            <ul className="space-y-2 text-sm text-canvas/70">
              <li className="flex items-center gap-2.5">
                <MessageCircle
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href={WHATSAPP_URL}
                  className="num transition-colors hover:text-canvas"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {WHATSAPP_NUMBER}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="transition-colors hover:text-canvas"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href={STORE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-canvas hover:underline"
                >
                  {isAr ? STORE_ADDRESS_AR : STORE_ADDRESS_EN}
                </a>
              </li>
            </ul>

            {/* Social icons */}
            <div className="flex items-center gap-1.5 pt-1">
              <SocialIcon
                href={WHATSAPP_URL}
                label="WhatsApp"
                icon={MessageCircle}
              />
              <SocialIcon
                href="https://facebook.com/printbyfalcon"
                label="Facebook"
                icon={Facebook}
              />
              <SocialIcon
                href="https://instagram.com/printbyfalcon"
                label="Instagram"
                icon={Instagram}
              />
              <SocialIcon
                href="https://linkedin.com/company/printbyfalcon"
                label="LinkedIn"
                icon={Linkedin}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-canvas">
              {isAr ? 'حسابي' : 'Account'}
            </h3>
            <ul className="space-y-2">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-canvas/70 transition-colors hover:text-canvas"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Combined utility row — payments (start) + legal links (end) */}
        <div className="mt-8 flex flex-col gap-4 border-t border-canvas/10 pt-5 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-1.5">
            {paymentMethods.map((label) => (
              <li key={label}>
                <span className="inline-flex items-center rounded-md bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink">
                  {label}
                </span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-canvas/60">
            {supportLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-canvas"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Slim copyright strip */}
      <div className="border-t border-canvas/10 bg-ink-2 py-3">
        <div className="container-page text-center text-[11px] text-canvas/60 md:text-start">
          © {year} {t('brand.name')}.{' '}
          {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof MessageCircle;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-canvas/10 text-canvas transition-colors hover:bg-canvas/20"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}
