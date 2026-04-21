import { requireAdmin } from '@/lib/auth';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';
import { GlobalThresholdForm } from '@/components/admin/global-threshold-form';

export const dynamic = 'force-dynamic';

export default async function InventorySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const current = await getGlobalLowStockThreshold();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'حدود المخزون' : 'Inventory thresholds'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'هذا الحد يُطبَّق على كل منتج ليس له تخصيص يدوي في صفحته. يُعتبر المنتج "منخفض" عندما يصبح الرصيد ≤ هذا الحد.'
          : 'This threshold applies to every product without a per-SKU override. A product is flagged "low" when available qty ≤ this value.'}
      </p>
      <GlobalThresholdForm initial={current} locale={locale} />
    </div>
  );
}
