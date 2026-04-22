import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PromoCodeForm } from '@/components/admin/promo-code-form';

export const dynamic = 'force-dynamic';

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const row = await prisma.promoCode.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'تعديل كود الخصم' : 'Edit promo code'}
      </h1>
      <p className="mb-6 text-xs text-muted-foreground">
        {isAr
          ? `استُخدم ${row.usedCount} مرة حتى الآن.`
          : `Used ${row.usedCount} time${row.usedCount === 1 ? '' : 's'} so far.`}
      </p>
      <PromoCodeForm
        locale={isAr ? 'ar' : 'en'}
        mode="edit"
        initial={{
          id: row.id,
          code: row.code,
          type: row.type,
          value: Number(row.value),
          minOrderEgp:
            row.minOrderEgp !== null ? Number(row.minOrderEgp) : null,
          maxDiscountEgp:
            row.maxDiscountEgp !== null ? Number(row.maxDiscountEgp) : null,
          usageLimit: row.usageLimit,
          validFrom: row.validFrom?.toISOString() ?? '',
          validTo: row.validTo?.toISOString() ?? '',
          active: row.active,
        }}
      />
    </div>
  );
}
