import { getLocale, getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { AdminLoginForm } from './admin-login-form';

export default async function AdminLoginPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';

  return (
    <main className="container-page flex min-h-[80vh] items-center justify-center py-10 md:py-16">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-background shadow-card">
        {/* Ink strip header — admin visual distinction from public /sign-in */}
        <div className="bg-ink px-8 py-6 text-canvas">
          <div className="inline-flex items-center gap-2 rounded-full border border-canvas/20 bg-canvas/5 px-2.5 py-1 text-xs font-medium">
            <ShieldCheck
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              aria-hidden
            />
            {isAr ? 'دخول الإدارة' : 'Admin panel'}
          </div>
          <h1 className="mt-3 text-xl font-bold text-canvas sm:text-2xl">
            {t('admin.loginTitle')}
          </h1>
          <p className="mt-1 text-sm text-canvas/70">
            {t('admin.loginPrompt')}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
