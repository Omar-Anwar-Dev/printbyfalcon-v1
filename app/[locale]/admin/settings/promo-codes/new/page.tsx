import { requireAdmin } from '@/lib/auth';
import { PromoCodeForm } from '@/components/admin/promo-code-form';

export default async function NewPromoCodePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="container-page max-w-2xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'إنشاء كود خصم جديد' : 'New promo code'}
      </h1>
      <PromoCodeForm locale={isAr ? 'ar' : 'en'} mode="create" />
    </div>
  );
}
