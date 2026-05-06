import { ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { getFreeShipThresholds } from '@/lib/settings/shipping';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FreeShipThresholdsForm } from '@/components/admin/free-ship-thresholds-form';
import { ZonesManager } from '@/components/admin/zones-manager';
import { SHIPPING_ZONE_SEED_CODES } from '@/lib/shipping/seed-zone-codes';

export const dynamic = 'force-dynamic';

export default async function ShippingSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [zones, thresholds] = await Promise.all([
    prisma.shippingZone.findMany({
      orderBy: [{ active: 'desc' }, { position: 'asc' }],
      include: {
        _count: {
          select: {
            governorateConfigs: { where: { deliverable: true } },
          },
        },
      },
    }),
    getFreeShipThresholds(),
  ]);

  const zoneRows = zones.map((z) => ({
    id: z.id,
    code: z.code,
    nameAr: z.nameAr,
    nameEn: z.nameEn,
    baseRateEgp: Number(z.baseRateEgp),
    freeShippingThresholdB2cEgp:
      z.freeShippingThresholdB2cEgp !== null
        ? Number(z.freeShippingThresholdB2cEgp)
        : null,
    freeShippingThresholdB2bEgp:
      z.freeShippingThresholdB2bEgp !== null
        ? Number(z.freeShippingThresholdB2bEgp)
        : null,
    codEnabled: z.codEnabled,
    estimatedDeliveryDaysMin: z.estimatedDeliveryDaysMin,
    estimatedDeliveryDaysMax: z.estimatedDeliveryDaysMax,
    active: z.active,
    governorateCount: z._count.governorateConfigs,
    isSeed: SHIPPING_ZONE_SEED_CODES.has(z.code),
  }));

  return (
    <div className="container-page max-w-5xl space-y-8 py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? 'الشحن والمناطق' : 'Shipping & zones'}
        subtitle={
          isAr
            ? 'إنشاء وحذف المناطق، أسعار الشحن، أيام التوصيل المتوقعة، حدود الشحن المجاني، وتفعيل الدفع عند الاستلام لكل منطقة.'
            : 'Create / delete zones, shipping rates, expected delivery days, free-shipping thresholds, and per-zone COD toggle.'
        }
      />

      <FreeShipThresholdsForm
        locale={isAr ? 'ar' : 'en'}
        initial={thresholds}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {isAr ? 'مناطق الشحن' : 'Shipping zones'}
          </h2>
          <Link
            href="/admin/settings/governorates"
            className="inline-flex items-center gap-1 text-sm text-accent-strong hover:underline"
          >
            {isAr ? 'إدارة المحافظات' : 'Manage governorates'}
            <ArrowRight
              className="h-3.5 w-3.5 rtl:rotate-180"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        </div>
        <ZonesManager locale={isAr ? 'ar' : 'en'} zones={zoneRows} />
      </section>
    </div>
  );
}
