import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { getActiveCart } from '@/lib/cart/cart';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { productImageUrl } from '@/lib/storage/paths';
import { getFreeShipThresholds } from '@/lib/settings/shipping';
import { getCodPolicy } from '@/lib/settings/cod';
import { getVatRate } from '@/lib/settings/vat';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import type { Governorate } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'إتمام الطلب' : 'Checkout',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const cart = await getActiveCart();
  const items = cart
    ? await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        orderBy: { addedAt: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              slug: true,
              nameAr: true,
              nameEn: true,
              vatExempt: true,
              images: {
                orderBy: { position: 'asc' },
                take: 1,
                select: { filename: true },
              },
            },
          },
        },
      })
    : [];

  if (items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  const user = await getOptionalUser();
  const isB2C = user?.type === 'B2C';
  const b2bCtx = await getB2BCheckoutContext();
  const viewerType: 'B2B' | 'B2C' = b2bCtx ? 'B2B' : 'B2C';

  const [addresses, governorateZones, thresholds, codPolicy, vat] =
    await Promise.all([
      isB2C
        ? prisma.address.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          })
        : Promise.resolve([]),
      prisma.governorateZone.findMany({
        select: {
          governorate: true,
          zone: {
            select: {
              id: true,
              code: true,
              nameAr: true,
              nameEn: true,
              baseRateEgp: true,
              freeShippingThresholdB2cEgp: true,
              freeShippingThresholdB2bEgp: true,
              codEnabled: true,
            },
          },
        },
      }),
      getFreeShipThresholds(),
      getCodPolicy(),
      getVatRate(),
    ]);

  // Build a Governorate → zone-info map for the form. If a governorate has
  // no mapping (shouldn't happen post-seed), the form shows a "contact us"
  // fallback and blocks submission.
  const shippingByGovernorate = Object.fromEntries(
    governorateZones.map((gz) => [
      gz.governorate,
      {
        zoneId: gz.zone.id,
        zoneCode: gz.zone.code,
        zoneNameAr: gz.zone.nameAr,
        zoneNameEn: gz.zone.nameEn,
        baseRateEgp: Number(gz.zone.baseRateEgp),
        codEnabled: gz.zone.codEnabled,
        freeShippingThresholdB2cEgp:
          gz.zone.freeShippingThresholdB2cEgp !== null
            ? Number(gz.zone.freeShippingThresholdB2cEgp)
            : null,
        freeShippingThresholdB2bEgp:
          gz.zone.freeShippingThresholdB2bEgp !== null
            ? Number(gz.zone.freeShippingThresholdB2bEgp)
            : null,
      },
    ]),
  ) as Record<
    Governorate,
    {
      zoneId: string;
      zoneCode: string;
      zoneNameAr: string;
      zoneNameEn: string;
      baseRateEgp: number;
      codEnabled: boolean;
      freeShippingThresholdB2cEgp: number | null;
      freeShippingThresholdB2bEgp: number | null;
    }
  >;

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty,
    0,
  );

  return (
    <main className="container-page max-w-5xl py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'إتمام الطلب' : 'Checkout'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'خطوة واحدة وتم' : 'One step to complete your order'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isAr
            ? 'راجع بياناتك واختر طريقة الدفع — الشحن لكل محافظات مصر خلال 1 – 5 أيام عمل.'
            : 'Review your details and pick a payment method — we ship nationwide in 1 – 5 business days.'}
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <CheckoutForm
          locale={isAr ? 'ar' : 'en'}
          user={
            user
              ? {
                  id: user.id,
                  name: user.name,
                  phone: user.phone,
                  email: user.email,
                }
              : null
          }
          savedAddresses={addresses.map((a) => ({
            id: a.id,
            recipientName: a.recipientName,
            phone: a.phone,
            governorate: a.governorate,
            city: a.city,
            area: a.area,
            street: a.street,
            building: a.building,
            apartment: a.apartment,
            notes: a.notes,
            isDefault: a.isDefault,
          }))}
          b2b={
            b2bCtx
              ? {
                  companyName:
                    (isAr ? b2bCtx.companyNameAr : b2bCtx.companyNameEn) ??
                    b2bCtx.companyNameAr,
                  allowPayNow: b2bCtx.allowPayNow,
                  allowSubmitForReview: b2bCtx.allowSubmitForReview,
                  tierCode: b2bCtx.tierCode,
                }
              : null
          }
          viewerType={viewerType}
          cartItems={items.map((i) => ({
            id: i.id,
            productId: i.product.id,
            sku: i.product.sku,
            nameAr: i.product.nameAr,
            nameEn: i.product.nameEn,
            thumbUrl: i.product.images[0]
              ? productImageUrl(
                  i.product.id,
                  'thumb',
                  i.product.images[0].filename,
                )
              : null,
            qty: i.qty,
            unitPriceEgp: Number(i.unitPriceEgpSnapshot),
            vatExempt: i.product.vatExempt,
          }))}
          subtotalEgp={subtotal}
          shippingByGovernorate={shippingByGovernorate}
          globalThresholds={thresholds}
          codPolicy={codPolicy}
          vatRatePercent={vat.percent}
        />
      </div>
    </main>
  );
}
