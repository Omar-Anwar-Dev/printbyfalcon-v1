import { requireAdmin } from '@/lib/auth';
import { BulkReceiveForm } from '@/components/admin/bulk-receive-form';

export const dynamic = 'force-dynamic';

export default async function BulkReceivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'استلام مجمَّع' : 'Bulk stock receive'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'الصق صفوف CSV بصيغة:  ‎sku,qty[,note]. كل سطر يُسجَّل في سجل الحركات كعملية استلام منفصلة.'
          : 'Paste CSV rows in the shape  sku,qty[,note]. Each row logs its own Receive movement + audit entry.'}
      </p>
      <BulkReceiveForm locale={locale} />
    </div>
  );
}
