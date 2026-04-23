import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { B2BApplicationForm } from './b2b-application-form';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
};

export default async function B2BRegisterPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'شركات' : 'Business'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('b2b.register.title')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {t('b2b.register.subtitle')}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-paper p-6 sm:p-8">
        <B2BApplicationForm locale={locale} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('b2b.register.alreadyHaveAccount')}{' '}
        <Link
          href="/b2b/login"
          className="font-medium text-accent-strong underline-offset-2 hover:text-accent hover:underline"
        >
          {t('b2b.register.loginLink')}
        </Link>
      </p>
    </main>
  );
}
