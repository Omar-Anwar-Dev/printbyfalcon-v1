import { getLocale, getTranslations } from 'next-intl/server';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { BrandMark } from '@/components/brand-mark';

const STORE_ADDRESS_AR = '12 محمد صدقي باشا، باب اللوق، القاهرة';
const STORE_ADDRESS_EN = '12 Mohamed Sedky Pasha, Bab Al-Louk, Cairo';
const STORE_MAPS_URL = 'https://maps.app.goo.gl/6gNmycfpDtsWkGgs8';
const SUPPORT_EMAIL = 'support@printbyfalcon.com';
const WHATSAPP_NUMBER = '+20 111 652 7773';
const WHATSAPP_URL = 'https://wa.me/201116527773';

/**
 * Site footer — minimalist single panel.
 *
 * One band. Brand block on the start side, a thin links column on
 * the end side, then a single bottom rule with the copyright + the
 * legal links inline. No trust strip, no payment chips, no separate
 * social icons row — those live elsewhere on the site (home value
 * props, checkout payment selector, WhatsApp floating button).
 *
 * Owner feedback: the previous "three bands" design read as crowded.
 * This pares the footer back to its actual job — brand, contact,
 * a couple of legal links — and nothing else.
 */
export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const year = new Date().getFullYear();

  const legalLinks = [
    {
      href: '/blog',
      label: isAr ? 'المدونة' : 'Blog',
    },
    {
      href: '/feedback',
      label: isAr ? 'شاركنا رأيك' : 'Feedback',
    },
    {
      href: '/faq',
      label: isAr ? 'الأسئلة الشائعة' : 'FAQ',
    },
    {
      href: '/contact',
      label: isAr ? 'تواصل معنا' : 'Contact',
    },
    {
      href: '/shipping',
      label: isAr ? 'الشحن' : 'Shipping',
    },
    {
      href: '/returns',
      label: isAr ? 'الاسترجاع' : 'Returns',
    },
    {
      href: '/privacy',
      label: isAr ? 'سياسة الخصوصية' : 'Privacy',
    },
    {
      href: '/terms',
      label: isAr ? 'شروط الاستخدام' : 'Terms',
    },
    {
      href: '/cookies',
      label: isAr ? 'ملفات تعريف الارتباط' : 'Cookies',
    },
  ];

  return (
    <footer className="mt-16 bg-ink text-canvas">
      <div className="container-page py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand block */}
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-bold transition-opacity hover:opacity-90"
            >
              <BrandMark size={32} />
              <span>{t('brand.name')}</span>
            </Link>
            <p className="max-w-sm text-sm text-canvas/60">
              {t('brand.tagline')}
            </p>
          </div>

          {/* Contact column */}
          <ul className="space-y-2 text-sm text-canvas/70">
            <li className="flex items-center gap-2.5">
              <MessageCircle
                className="h-4 w-4 shrink-0 text-canvas/50"
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
                className="h-4 w-4 shrink-0 text-canvas/50"
                strokeWidth={1.75}
                aria-hidden
              />
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="break-all transition-colors hover:text-canvas"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-canvas/50"
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
        </div>

        {/* Slim bottom row — copyright + legal */}
        <div className="mt-8 flex flex-col gap-3 border-t border-canvas/10 pt-5 text-xs text-canvas/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {t('brand.name')}.{' '}
            {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {legalLinks.map((link) => (
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
    </footer>
  );
}
