import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { B2BLoginForm } from '@/app/[locale]/login/b2b-login-form';
import { Link } from '@/lib/i18n/routing';

export default async function B2BLoginPage() {
  const t = await getTranslations();
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">{t('auth.b2bTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.signIn')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <B2BLoginForm />
          <div className="mt-4 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <Link
              href="/b2b/forgot-password"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
            <Link
              href="/b2b/register"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('b2b.login.noAccountYet')}
            </Link>
            <Link
              href="/sign-in"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('auth.b2cTitle')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
