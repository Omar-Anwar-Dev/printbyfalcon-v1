import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { getActiveCart } from '@/lib/cart/cart';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { productImageUrl } from '@/lib/storage/paths';
import { formatEgp } from '@/lib/catalog/price';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { ReorderButton } from '@/components/account/reorder-button';

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
        <EmptyCart locale={isAr ? 'ar' : 'en'} />
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
              className="block w-full rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
            >
              {isAr ? 'المتابعة للدفع' : 'Proceed to checkout'}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

/**
 * Sprint 8 S8-D7-T1 — B2B-aware empty cart state. If the caller is an ACTIVE
 * B2B user with past orders, show the 3 most recent with one-click reorder.
 * B2C / guests / applicants get the standard "Browse products" fallback.
 */
async function EmptyCart({ locale }: { locale: 'ar' | 'en' }) {
  const isAr = locale === 'ar';
  const b2b = await getB2BCheckoutContext();

  const recent = b2b
    ? await prisma.order.findMany({
        where: { companyId: b2b.companyId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          totalEgp: true,
          _count: { select: { items: true } },
        },
      })
    : [];

  const baseLabels = {
    reorderCta: isAr ? 'أعِد' : 'Reorder',
    loading: isAr ? 'جارٍ...' : 'Loading…',
    modalTitleTemplate: isAr
      ? `إعادة طلب {orderNumber}`
      : `Reorder {orderNumber}`,
    body: isAr
      ? 'راجع الأصناف — هنضيف المتاح بالأسعار الحالية.'
      : 'Review lines — available items added at current prices.',
    statusLabels: {
      available: isAr ? 'متوفر' : 'Available',
      partial: isAr ? 'محدود' : 'Limited',
      out_of_stock: isAr ? 'نفد' : 'Out of stock',
      archived: isAr ? 'مؤرشف' : 'Archived',
    },
    includeColumn: isAr ? 'ضم' : 'Add',
    productColumn: isAr ? 'المنتج' : 'Product',
    statusColumn: isAr ? 'الحالة' : 'Status',
    qtyColumn: isAr ? 'الكمية' : 'Qty',
    priceColumn: isAr ? 'السعر' : 'Price',
    addCta: isAr ? 'أضف للسلة' : 'Add to cart',
    adding: isAr ? 'جارٍ...' : 'Adding…',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    successLineTemplate: isAr
      ? `أضيف {count} صنف — افتح السلة.`
      : `{count} added — open cart.`,
    nothingToAdd: isAr ? 'مفيش أصناف متاحة.' : 'Nothing available.',
    errorGeneric: isAr ? 'حصل خطأ.' : 'Something went wrong.',
    archivedHeader: isAr ? 'مؤرشف' : 'Archived',
  };

  return (
    <div className="rounded-md border bg-background p-8 text-center">
      <p className="mb-4 text-lg">
        {isAr ? 'سلتك فارغة' : 'Your cart is empty'}
      </p>

      {b2b && recent.length > 0 ? (
        <div className="mb-6 text-start">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            {isAr ? 'أعِد طلبًا سابقًا' : 'Reorder a recent order'}
          </h2>
          <ul className="space-y-2">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
              >
                <div className="flex-1 text-sm">
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}{' '}
                    · {o._count.items} {isAr ? 'أصناف' : 'items'} ·{' '}
                    {formatEgp(o.totalEgp.toString(), locale)}
                  </span>
                </div>
                <ReorderButton
                  orderId={o.id}
                  locale={locale}
                  compact
                  labels={baseLabels}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/products"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {isAr ? 'تسوق المنتجات' : 'Browse products'}
        </Link>
        {b2b ? (
          <Link
            href="/b2b/bulk-order"
            className="inline-block rounded-md border bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            {isAr ? 'طلب مُجمَّع' : 'Bulk order'}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
