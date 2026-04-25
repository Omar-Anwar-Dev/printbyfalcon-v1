import type { Metadata } from 'next';
import { ArrowRight, ShoppingBag, Truck, ShieldCheck } from 'lucide-react';
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
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  return (
    <main className="container-page py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'السلة' : 'Cart'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'سلة التسوق' : 'Shopping cart'}
        </h1>
        {items.length > 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAr
              ? `${itemCount} ${itemCount === 1 ? 'عنصر' : 'عناصر'}`
              : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyCart locale={isAr ? 'ar' : 'en'} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
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

          <aside className="h-fit space-y-5 rounded-xl border border-border bg-paper p-5 lg:sticky lg:top-36">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {isAr ? 'ملخص الطلب' : 'Order summary'}
            </h2>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal'}
                </dt>
                <dd className="num font-semibold text-foreground">
                  {formatEgp(subtotal.toFixed(2), isAr ? 'ar' : 'en')}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {isAr ? 'الشحن' : 'Shipping'}
                </dt>
                <dd className="text-xs text-muted-foreground">
                  {isAr ? 'يُحسب في الخطوة التالية' : 'Calculated next'}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
            >
              {isAr ? 'المتابعة للدفع' : 'Proceed to checkout'}
              <ArrowRight
                className="h-4 w-4 rtl:rotate-180"
                strokeWidth={2}
                aria-hidden
              />
            </Link>

            <Link
              href="/products"
              className="block text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {isAr ? 'متابعة التسوّق' : 'Continue shopping'}
            </Link>

            {/* Trust strip inside the summary */}
            <ul className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck
                  className="h-3.5 w-3.5 shrink-0 text-accent-strong"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {isAr
                  ? 'منتجات أصلية، من غير تقليد'
                  : 'Genuine products, no knockoffs'}
              </li>
              <li className="flex items-center gap-2">
                <Truck
                  className="h-3.5 w-3.5 shrink-0 text-accent-strong"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {isAr ? 'توصيل لكل المحافظات' : 'Nationwide delivery'}
              </li>
            </ul>
          </aside>
        </div>
      )}
    </main>
  );
}

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
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-paper p-10 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-background text-muted-foreground shadow-card">
        <ShoppingBag className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        {isAr ? 'سلتك فارغة' : 'Your cart is empty'}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isAr
          ? 'ابدأ تسوقك بموديل طابعتك أو تصفّح الكتالوج.'
          : 'Start by searching your printer model or browsing the catalog.'}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
        >
          {isAr ? 'تسوّق المنتجات' : 'Browse products'}
          <ArrowRight
            className="h-4 w-4 rtl:rotate-180"
            strokeWidth={2}
            aria-hidden
          />
        </Link>
        {b2b ? (
          <Link
            href="/b2b/bulk-order"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
          >
            {isAr ? 'طلب مُجمَّع' : 'Bulk order'}
          </Link>
        ) : null}
      </div>

      {b2b && recent.length > 0 ? (
        <div className="mt-8 border-t border-border pt-6 text-start">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {isAr ? 'أعِد طلبًا سابقًا' : 'Reorder a recent order'}
          </h3>
          <ul className="space-y-2">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2.5"
              >
                <div className="flex-1 text-sm">
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="num font-mono font-medium text-foreground hover:underline"
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
    </div>
  );
}
