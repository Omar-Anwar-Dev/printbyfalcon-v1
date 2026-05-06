import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { GovernoratesTable } from '@/components/admin/governorates-table';

export const dynamic = 'force-dynamic';

export default async function GovernoratesSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [configs, zones] = await Promise.all([
    prisma.governorateConfig.findMany({
      orderBy: { position: 'asc' },
      select: {
        code: true,
        nameAr: true,
        nameEn: true,
        deliverable: true,
        zoneId: true,
        position: true,
      },
    }),
    prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      select: { id: true, nameAr: true, nameEn: true, code: true },
    }),
  ]);

  return (
    <div className="container-page max-w-5xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? 'المحافظات' : 'Governorates'}
        subtitle={
          isAr
            ? 'فعّل أو عطّل التوصيل لكل محافظة، عدّل الأسماء، وأعد ربطها بمنطقة شحن. المحافظات المعطّلة تختفي من نموذج العنوان وتُرفض في الشيك‌آوت.'
            : 'Toggle delivery per governorate, rename, and reassign to a shipping zone. Disabled governorates hide from the address form and are rejected at checkout.'
        }
      />
      <GovernoratesTable
        locale={isAr ? 'ar' : 'en'}
        rows={configs}
        zones={zones}
      />
    </div>
  );
}
