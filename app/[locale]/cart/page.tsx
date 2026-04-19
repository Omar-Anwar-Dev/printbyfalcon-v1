import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { getActiveCart } from '@/lib/cart/cart';
import { productImageUrl } from '@/lib/storage/paths';
import { formatEgp } from '@/lib/catalog/price';
import { CartItemRow } from '@/components/cart/cart-item-row';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'السلة' : 'Cart',
    robots: { index: false, follow: false },
  };
}

export default async function CartPage({
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
              slug: true,
              sku: true,
              nameAr: true,
              nameEn: true,
              basePriceEgp: true,
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

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty,
    0,
  );

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'سلة التسوق' : 'Shopping cart'}
      </h1>

      {items.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center">
          <p className="mb-4 text-lg">
            {isAr ? 'سلتك فارغة' : 'Your cart is empty'}
          </p>
          <Link
            href="/products"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {isAr ? 'تسوق المنتجات' : 'Browse products'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {items.map((i) => (
              <CartItemRow
                key={i.id}
                locale={isAr ? 'ar' : 'en'}
                item={{
                  id: i.id,
                  slug: i.product.slug,
                  sku: i.product.sku,
                  name: isAr ? i.product.nameAr : i.product.nameEn,
                  qty: i.qty,
                  unitPrice: i.unitPriceEgpSnapshot.toString(),
                  lineTotal: (
                    Number(i.unitPriceEgpSnapshot) * i.qty
                  ).toString(),
                  imageUrl: i.product.images[0]
                    ? productImageUrl(
                        i.product.id,
                        'thumb',
                        i.product.images[0].filename,
                      )
                    : null,
                }}
              />
            ))}
          </ul>

          <aside className="space-y-4 rounded-md border bg-background p-4">
            <h2 className="text-base font-semibold">
              {isAr ? 'ملخص الطلب' : 'Order summary'}
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal'}
                </dt>
                <dd>{formatEgp(subtotal.toFixed(2), isAr ? 'ar' : 'en')}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>{isAr ? 'الشحن' : 'Shipping'}</dt>
                <dd>{isAr ? 'يُحسب في الخطوة التالية' : 'Calculated next'}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="block w-full rounded-md bg-primary px-4 py-2 text-center font-medium text-primary-foreground hover:opacity-90"
            >
              {isAr ? 'المتابعة للدفع' : 'Proceed to checkout'}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
