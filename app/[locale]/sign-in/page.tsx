import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/lib/i18n/routing';
import { B2CSignInFlow } from './b2c-sign-in-flow';

export default async function SignInPage() {
  const t = await getTranslations();
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">{t('auth.b2cTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.signIn')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <B2CSignInFlow />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/b2b/login"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('auth.b2bTitle')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
