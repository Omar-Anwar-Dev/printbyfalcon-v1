import { getLocale, getTranslations } from 'next-intl/server';
import {
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Truck,
  ShieldCheck,
  CreditCard,
  Headphones,
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
 * Site footer — full redesign (post pre-M1 polish round 4).
 *
 * Three horizontal bands inside one ink panel:
 *   1. Trust strip — four icon-led promises, equal columns on desktop,
 *      2×2 grid on mobile, kept visually distinct via a tinted wash.
 *   2. Main grid — brand block + four link columns (Shop, Account,
 *      Business, Help). Stacks gracefully on mobile.
 *   3. Utility row — copyright + payment chips + socials, single line on
 *      desktop, wraps on mobile.
 *
 * Replaces the previous two-row "compact footer" which the owner felt
 * read as the same as before. This restructures rather than just
 * tightens — different bands, different content emphasis.
 */
export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const year = new Date().getFullYear();

  const trustItems = [
    {
      icon: Truck,
      title: isAr ? 'شحن لكل المحافظات' : 'Nationwide shipping',
      body: isAr ? '1 – 5 أيام عمل' : '1 – 5 business days',
    },
    {
      icon: CreditCard,
      title: isAr ? 'الدفع عند الاستلام' : 'Cash on delivery',
      body: isAr ? 'متاح على أغلب الطلبات' : 'Available on most orders',
    },
    {
      icon: ShieldCheck,
      title: isAr ? 'منتجات أصلية' : 'Authentic products',
      body: isAr ? 'بضمان الموزّع الرسمي' : 'Backed by official suppliers',
    },
    {
      icon: Headphones,
      title: isAr ? 'دعم واتساب' : 'WhatsApp support',
      body: isAr ? 'فريق مبيعات حقيقي' : 'Real sales team, no bots',
    },
  ];

  const linkColumns: Array<{
    heading: string;
    links: Array<{ href: string; label: string }>;
  }> = [
    {
      heading: isAr ? 'تسوّق' : 'Shop',
      links: [
        { href: '/products', label: t('nav.catalog') },
        {
          href: '/search',
          label: isAr ? 'ابحث بموديل الطابعة' : 'Search by printer',
        },
        {
          href: '/categories/ink-cartridges',
          label: isAr ? 'خراطيش الحبر' : 'Ink cartridges',
        },
        {
          href: '/categories/toner',
          label: isAr ? 'خراطيش التونر' : 'Toner cartridges',
        },
      ],
    },
    {
      heading: isAr ? 'حسابي' : 'Account',
      links: [
        { href: '/account', label: t('nav.account') },
        {
          href: '/account/orders',
          label: isAr ? 'طلباتي' : 'My orders',
        },
        {
          href: '/account/addresses',
          label: isAr ? 'العناوين' : 'Addresses',
        },
        { href: '/cart', label: t('nav.cart') },
      ],
    },
    {
      heading: isAr ? 'للشركات' : 'Business',
      links: [
        {
          href: '/b2b/login',
          label: isAr ? 'تسجيل دخول الشركات' : 'Business login',
        },
        {
          href: '/b2b/register',
          label: isAr ? 'افتح حساب شركة' : 'Register a business',
        },
        {
          href: '/b2b/bulk-order',
          label: isAr ? 'طلب بالجملة' : 'Bulk order',
        },
      ],
    },
    {
      heading: isAr ? 'مساعدة وقانون' : 'Help & legal',
      links: [
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
      ],
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
      {/* Band 1 — Trust strip */}
      <div className="border-b border-canvas/10 bg-canvas/[0.03]">
        <div className="container-page grid grid-cols-2 gap-x-4 gap-y-5 py-6 sm:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-canvas/10 text-canvas">
                <item.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-canvas">
                  {item.title}
                </p>
                <p className="text-xs text-canvas/60">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Band 2 — Brand + link columns */}
      <div className="container-page py-10">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand block — wider on md+ */}
          <div className="space-y-4 md:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-bold transition-opacity hover:opacity-90"
            >
              <BrandMark size={36} />
              <span>{t('brand.name')}</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-canvas/70">
              {t('brand.tagline')}
            </p>
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

          {/* Link columns — 2 cols on small mobile, 4 on tablet/desktop */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:col-span-8 md:grid-cols-4">
            {linkColumns.map((col) => (
              <div key={col.heading} className="min-w-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-canvas">
                  {col.heading}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block break-words text-sm text-canvas/70 transition-colors hover:text-canvas"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Band 3 — Utility row */}
      <div className="border-t border-canvas/10">
        <div className="container-page flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          {/* Copyright (start) + payments (center) + socials (end) */}
          <p className="text-xs text-canvas/60">
            © {year} {t('brand.name')}.{' '}
            {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>

          <ul className="flex flex-wrap items-center gap-1.5">
            {paymentMethods.map((label) => (
              <li key={label}>
                <span className="inline-flex items-center rounded-md border border-canvas/15 bg-canvas/[0.05] px-2.5 py-1 text-[11px] font-semibold text-canvas">
                  {label}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
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
