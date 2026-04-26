import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ForgotPasswordForm } from './forgot-password-form';

type Props = { params: Promise<{ locale: 'ar' | 'en' }> };

export default async function B2BForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset your password'}
          </CardTitle>
          <CardDescription>
            {isAr
              ? 'أدخل بريد العمل المسجّل وسنرسل لك رابط إعادة التعيين.'
              : "Enter your work email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm locale={locale} />
        </CardContent>
      </Card>
    </main>
  );
}
