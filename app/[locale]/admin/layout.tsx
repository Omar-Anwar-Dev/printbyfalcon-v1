import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { getOptionalUser } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const user = await getOptionalUser();
  const showNav = user?.type === 'ADMIN';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/admin" className="font-semibold">
            {t('admin.loginTitle')}
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <span className="text-sm text-muted-foreground">
                {t('auth.signedInAs')} {user.email ?? user.name}
              </span>
            ) : null}
            <LanguageSwitcher />
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
