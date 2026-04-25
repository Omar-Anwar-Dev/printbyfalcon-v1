import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { getOptionalUser } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  const showNav = user?.type === 'ADMIN';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/admin" className="font-semibold">
            {t('admin.loginTitle')}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {t('auth.signedInAs')} {user.email ?? user.name}
              </span>
            ) : null}
            <LanguageSwitcher />
            {user ? (
              <LogoutButton
                variant="topbar"
                label={isAr ? 'تسجيل الخروج' : 'Sign out'}
                pendingLabel={isAr ? 'جارٍ الخروج...' : 'Signing out...'}
              />
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex flex-1 bg-muted/30">
        {showNav ? (
          <aside className="hidden w-56 border-e bg-background md:block">
            <AdminNav />
          </aside>
        ) : null}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
