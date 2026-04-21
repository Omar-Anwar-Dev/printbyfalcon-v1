import { requireAdmin } from '@/lib/auth';
import { getStoreInfo } from '@/lib/settings/store-info';
import { StoreInfoForm } from '@/components/admin/store-info-form';

export const dynamic = 'force-dynamic';

export default async function StoreInfoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const current = await getStoreInfo();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'بيانات المتجر والفاتورة' : 'Store & invoice info'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'هذه البيانات تظهر في ترويسة كل فاتورة. أي تعديل يُطبَّق على الفواتير اللاحقة فقط — الفواتير السابقة تبقى بنسختها الأصلية.'
          : 'These values render on every invoice header. Changes apply to future invoices only — prior invoices retain their original snapshot via the amendment flow.'}
      </p>
      <StoreInfoForm initial={current} locale={locale} />
    </div>
  );
}
