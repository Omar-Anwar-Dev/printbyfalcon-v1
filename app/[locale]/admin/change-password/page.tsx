import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChangePasswordForm } from './change-password-form';

export default async function AdminChangePasswordPage() {
  await requireAdmin();
  const t = await getTranslations();

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.mustResetPassword')}</CardTitle>
          <CardDescription>{t('admin.loginPrompt')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
