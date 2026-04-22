import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { getActiveCart } from '@/lib/cart/cart';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { productImageUrl } from '@/lib/storage/paths';
import { CheckoutForm } from '@/components/checkout/checkout-form';

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

  const addresses = isB2C
    ? await prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
    : [];

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty,
    0,
  );

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'إتمام الطلب' : 'Checkout'}
      </h1>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
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
        />
        <aside className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-base font-semibold">
            {isAr ? 'ملخص الطلب' : 'Order summary'}
          </h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                {i.product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={productImageUrl(
                      i.product.id,
                      'thumb',
                      i.product.images[0].filename,
                    )}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded bg-muted" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {isAr ? i.product.nameAr : i.product.nameEn} × {i.qty}
                </span>
                <span className="shrink-0 font-medium">
                  {(Number(i.unitPriceEgpSnapshot) * i.qty).toLocaleString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}{' '}
                  {isAr ? 'ج.م' : 'EGP'}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal'}
              </dt>
              <dd>
                {subtotal.toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                {isAr ? 'ج.م' : 'EGP'}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>{isAr ? 'الشحن' : 'Shipping'}</dt>
              <dd>{isAr ? 'مجاني (مؤقتًا)' : 'Free (placeholder)'}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{isAr ? 'الإجمالي' : 'Total'}</dt>
              <dd>
                {subtotal.toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                {isAr ? 'ج.م' : 'EGP'}
              </dd>
            </div>
          </dl>
          <p className="text-xs italic text-muted-foreground">
            {isAr
              ? 'الشحن والضريبة يُحسبان على التفصيل في Sprint 9.'
              : 'Shipping + VAT breakout land in Sprint 9.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
