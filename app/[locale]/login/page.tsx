import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { B2BLoginForm } from './b2b-login-form';
import { Link } from '@/lib/i18n/routing';

export default async function LoginPage() {
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
          <div className="mt-4 text-center text-sm text-muted-foreground">
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
