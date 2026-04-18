import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function AdminHomePage() {
  const user = await requireAdmin();
  const t = await getTranslations();

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('admin.loginTitle')}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sprint 1 placeholder</CardTitle>
            <CardDescription>
              Full dashboard widgets arrive in Sprint 10.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Logged in as <strong>{user.email}</strong> ({user.adminRole}).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
