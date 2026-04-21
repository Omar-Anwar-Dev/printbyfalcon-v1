import { getLocale, getTranslations } from 'next-intl/server';
import { MessageCircle, Mail, MapPin } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

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
    { href: '/account/orders', label: isAr ? 'طلباتي' : 'My orders' },
    { href: '/account/addresses', label: isAr ? 'العناوين' : 'Addresses' },
    { href: '/b2b/login', label: isAr ? 'حساب شركات' : 'Business login' },
    {
      href: '/b2b/register',
      label: isAr ? 'تسجيل حساب شركة' : 'Register a business',
    },
  ];

  const supportLinks = [
    {
      href: '/help',
      label: isAr ? 'مركز المساعدة' : 'Help center',
    },
    {
      href: '/shipping',
      label: isAr ? 'الشحن والتوصيل' : 'Shipping & delivery',
    },
    {
      href: '/returns',
      label: isAr ? 'الاسترجاع' : 'Returns',
    },
    {
      href: '/contact',
      label: isAr ? 'تواصل معنا' : 'Contact us',
    },
  ];

  const legalLinks = [
    {
      href: '/privacy',
      label: isAr ? 'سياسة الخصوصية' : 'Privacy policy',
    },
    {
      href: '/terms',
      label: isAr ? 'شروط الاستخدام' : 'Terms of service',
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-paper">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-sm font-bold text-canvas">
                PF
              </span>
              {t('brand.name')}
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t('brand.tagline')}
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <MessageCircle
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="num">+20 111 652 7773</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <a
                  href="mailto:hello@printbyfalcon.com"
                  className="hover:text-foreground"
                >
                  hello@printbyfalcon.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{isAr ? 'القاهرة، مصر' : 'Cairo, Egypt'}</span>
              </li>
            </ul>
          </div>

          <FooterColumn heading={isAr ? 'تسوق' : 'Shop'} links={shopLinks} />
          <FooterColumn
            heading={isAr ? 'حسابي' : 'Account'}
            links={accountLinks}
          />
          <FooterColumn
            heading={isAr ? 'الدعم' : 'Support'}
            links={supportLinks}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            © {year} {t('brand.name')}.{' '}
            {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </span>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
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

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
        {heading}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
