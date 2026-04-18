import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { getOptionalUser } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const user = await getOptionalUser();

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
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
