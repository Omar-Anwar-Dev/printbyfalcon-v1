import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const t = await getTranslations();
  return (
    <section className="container flex flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-3xl font-bold md:text-5xl">{t('home.hello')}</h1>
      <p className="max-w-xl text-muted-foreground">{t('home.comingSoon')}</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">{t('auth.signIn')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-in">{t('auth.b2cTitle')}</Link>
        </Button>
      </div>
    </section>
  );
}
