import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getOptionalUser } from '@/lib/auth';

export async function SiteHeader() {
  const t = await getTranslations();
  const user = await getOptionalUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">{t('brand.name')}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="hover:text-primary">
            {t('nav.home')}
          </Link>
          <Link href="/catalog" className="hover:text-primary">
            {t('nav.catalog')}
          </Link>
          <Link href="/business" className="hover:text-primary">
            {t('nav.business')}
          </Link>
          <Link href="/support" className="hover:text-primary">
            {t('nav.support')}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {user ? (
            <Link
              href="/account"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('nav.account')}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
