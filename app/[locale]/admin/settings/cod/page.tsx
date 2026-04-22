import { requireAdmin } from '@/lib/auth';
import { getCodPolicy } from '@/lib/settings/cod';
import { CodPolicyForm } from '@/components/admin/cod-policy-form';

export const dynamic = 'force-dynamic';

export default async function CodSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';
  const policy = await getCodPolicy();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'سياسة الدفع عند الاستلام' : 'Cash on delivery policy'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'اضبط الرسوم والحد الأقصى للطلب. التفعيل لكل منطقة يتم من صفحة الشحن.'
          : 'Set fee and max-order cap. Per-zone availability lives on the shipping page.'}
      </p>
      <CodPolicyForm locale={isAr ? 'ar' : 'en'} initial={policy} />
    </div>
  );
}
