import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

  const [productCount, brandCount, categoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.brand.count(),
    prisma.category.count(),
  ]);

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('admin.loginTitle')}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.products')}</CardTitle>
            <CardDescription>{productCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.brands')}</CardTitle>
            <CardDescription>{brandCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.categories')}</CardTitle>
            <CardDescription>{categoryCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('auth.signedInAs')} <strong>{user.email}</strong> (
              {user.adminRole}).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
