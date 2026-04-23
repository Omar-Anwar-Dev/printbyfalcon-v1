import { getLocale, getTranslations } from 'next-intl/server';
import {
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  CreditCard,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

/**
 * Four-column footer — Sprint 11 ADR-059 update.
 *
 * Changes from foundation pass:
 *   - Background flipped to solid ink (was light paper).
 *   - Broken links removed (/help, /shipping, /returns, /contact, /account/orders)
 *     pending dedicated pages in v1.1. Support contact handled inline.
 *   - Added: payment methods row, social icons row, newsletter-signup placeholder,
 *     separated copyright strip in ink-2.
 */
export async function SiteFooter() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const year = new Date().getFullYear();

  const shopLinks = [
    { href: '/products', label: t('nav.catalog') },
    {
      href: '/categories/printers',
      label: isAr ? 'الطابعات' : 'Printers',
    },
    {
      href: '/categories/consumables',
      label: isAr ? 'الحبر والمستلزمات' : 'Ink & supplies',
    },
    {
      href: '/search',
      label: isAr ? 'البحث الذكي' : 'Smart search',
    },
  ];

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

  return (
    <footer className="mt-24 bg-ink text-canvas">
      <div className="container-page pb-10 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
          {/* Brand + contact block */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 text-lg font-bold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-canvas text-sm font-bold text-ink">
                PF
              </span>
              {t('brand.name')}
            </div>
            <p className="max-w-xs text-sm text-canvas/70">
              {t('brand.tagline')}
            </p>
            <ul className="space-y-2.5 text-sm text-canvas/70">
              <li className="flex items-center gap-2.5">
                <MessageCircle
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href="https://wa.me/201116527773"
                  className="num transition-colors hover:text-canvas"
                >
                  +20 111 652 7773
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href="mailto:hello@printbyfalcon.com"
                  className="transition-colors hover:text-canvas"
                >
                  hello@printbyfalcon.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{isAr ? 'القاهرة، مصر' : 'Cairo, Egypt'}</span>
              </li>
            </ul>

            {/* Social icons */}
            <div className="flex items-center gap-2 pt-1">
              <SocialIcon
                href="https://wa.me/201116527773"
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

          <FooterColumn heading={isAr ? 'تسوق' : 'Shop'} links={shopLinks} />
          <FooterColumn
            heading={isAr ? 'حسابي' : 'Account'}
            links={accountLinks}
          />

          {/* Newsletter column */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-canvas">
              {isAr ? 'اشترك للنشرة' : 'Newsletter'}
            </h3>
            <p className="mb-4 text-sm text-canvas/70">
              {isAr
                ? 'اشترك لمعرفة آخر العروض والمنتجات الجديدة.'
                : 'Get the latest deals and new arrivals.'}
            </p>
            {/* Server Component — no onSubmit handler. Inputs + button are disabled,
               so the form cannot be submitted until the wiring lands in v1.1. */}
            <form
              className="flex overflow-hidden rounded-md bg-canvas/10 ring-1 ring-canvas/20"
              action="#"
            >
              <input
                type="email"
                inputMode="email"
                placeholder={isAr ? 'بريدك الإلكتروني' : 'your@email.com'}
                aria-label={isAr ? 'البريد الإلكتروني' : 'Email address'}
                disabled
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-canvas outline-none placeholder:text-canvas/50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled
                className="bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAr ? 'اشترك' : 'Subscribe'}
              </button>
            </form>
            <p className="mt-2 text-xs text-canvas/50">
              {isAr ? 'قريباً — v1.1' : 'Coming soon — v1.1'}
            </p>
          </div>
        </div>

        {/* Payment methods row */}
        <div className="mt-10 flex flex-col items-start gap-4 border-t border-canvas/10 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-xs text-canvas/60">
            <CreditCard className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span>
              {isAr ? 'طرق الدفع المقبولة:' : 'Accepted payment methods:'}
            </span>
          </div>
          <ul className="flex flex-wrap items-center gap-2">
            <PaymentPill label="Visa" />
            <PaymentPill label="Mastercard" />
            <PaymentPill label="Meeza" />
            <PaymentPill label="Fawry" />
            <PaymentPill label={isAr ? 'الدفع عند الاستلام' : 'COD'} />
          </ul>
        </div>

        {/* Support / legal link row */}
        <div className="mt-6 flex flex-col gap-3 text-sm text-canvas/60 md:flex-row md:flex-wrap md:items-center md:gap-5">
          {supportLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-canvas"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Copyright strip — slightly darker, separate rail */}
      <div className="border-t border-canvas/10 bg-ink-2 py-4">
        <div className="container-page text-center text-xs text-canvas/60 md:text-start">
          © {year} {t('brand.name')}.{' '}
          {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-canvas">
        {heading}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-canvas/10 text-canvas transition-colors hover:bg-canvas/20"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

function PaymentPill({ label }: { label: string }) {
  return (
    <li>
      <span className="inline-flex items-center rounded-md bg-canvas px-3 py-1 text-xs font-semibold text-ink">
        {label}
      </span>
    </li>
  );
}
