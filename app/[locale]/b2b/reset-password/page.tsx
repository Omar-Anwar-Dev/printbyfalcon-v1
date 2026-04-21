import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResetPasswordForm } from './reset-password-form';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function B2BResetPasswordPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  const isAr = locale === 'ar';

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isAr ? 'اختيار كلمة مرور جديدة' : 'Choose a new password'}
          </CardTitle>
          <CardDescription>
            {isAr
              ? 'أدخل كلمة المرور الجديدة مرتين.'
              : 'Enter your new password twice to confirm.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token ?? ''} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
