import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { getReturnPolicy } from '@/lib/returns/policy';
import { ReturnPolicyForm } from '@/components/admin/return-policy-form';

export default async function AdminReturnPolicySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [policy, nonReturnable] = await Promise.all([
    getReturnPolicy(),
    prisma.product.findMany({
      where: { returnable: false, status: 'ACTIVE' },
      select: { id: true, sku: true, nameAr: true, nameEn: true },
      orderBy: { sku: 'asc' },
      take: 20,
    }),
  ]);

  return (
    <div className="container py-8">
      <Link
        href="/admin/settings"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'إعدادات المتجر' : 'Back to settings'}
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'سياسة الاسترجاع' : 'Return policy'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'تحدد هنا نافذة الاسترجاع والحد الأدنى للطلب والصلاحيات المسموح لها بتجاوز السياسة عند الضرورة. التعديل يُسجَّل في سجل التدقيق.'
          : 'Configure the return window, minimum order value, and which admin roles may override the policy. All changes are audit-logged.'}
      </p>

      <ReturnPolicyForm policy={policy} isAr={isAr} />

      <section className="mt-10 rounded-md border bg-background p-5">
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? 'منتجات غير قابلة للاسترجاع' : 'Non-returnable products'}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {isAr
            ? 'المنتجات التالية مُعلّم عليها "غير قابلة للاسترجاع" في صفحة تعديل المنتج. عرض أول 20 منتج.'
            : 'Products marked "not returnable" on their product edit page. Showing first 20.'}
        </p>
        {nonReturnable.length === 0 ? (
          <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
            {isAr
              ? 'كل المنتجات قابلة للاسترجاع حاليًا.'
              : 'All products are returnable.'}
          </p>
        ) : (
          <ul className="divide-y rounded border">
            {nonReturnable.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {isAr ? p.nameAr : p.nameEn}
                  </Link>
                  <span
                    className="ms-2 font-mono text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {p.sku}
                  </span>
                </div>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {isAr ? 'تعديل' : 'Edit'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
