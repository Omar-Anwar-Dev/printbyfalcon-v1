import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFreeShipThresholds } from '@/lib/settings/shipping';
import { ShippingSettingsForm } from '@/components/admin/shipping-settings-form';

export const dynamic = 'force-dynamic';

export default async function ShippingSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [zones, governorateZones, thresholds] = await Promise.all([
    prisma.shippingZone.findMany({ orderBy: { position: 'asc' } }),
    prisma.governorateZone.findMany(),
    getFreeShipThresholds(),
  ]);

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'الشحن والمحافظات' : 'Shipping & governorates'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'اضبط سعر الشحن لكل منطقة، حدود الشحن المجاني، وربط المحافظات بالمناطق.'
          : 'Configure per-zone rates, free-shipping thresholds, and the governorate-to-zone map.'}
      </p>
      <ShippingSettingsForm
        locale={isAr ? 'ar' : 'en'}
        zones={zones.map((z) => ({
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
        }))}
        governorateMap={Object.fromEntries(
          governorateZones.map((gz) => [gz.governorate, gz.zoneId]),
        )}
        thresholds={thresholds}
      />
    </div>
  );
}
