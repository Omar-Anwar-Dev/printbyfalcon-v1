import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/lib/i18n/routing';
import { B2BApplicationForm } from './b2b-application-form';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
};

export default async function B2BRegisterPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations();
  return (
    <div className="container py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle>{t('b2b.register.title')}</CardTitle>
          <CardDescription>{t('b2b.register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <B2BApplicationForm locale={locale} />
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('b2b.register.alreadyHaveAccount')}{' '}
            <Link
              href="/b2b/login"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('b2b.register.loginLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
