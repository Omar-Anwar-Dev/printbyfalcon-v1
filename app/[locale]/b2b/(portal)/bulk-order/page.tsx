/**
 * Sprint 8 S8-D4 — B2B bulk order landing page.
 *
 * Server-rendered shell that enforces the B2B gate + wires bilingual labels
 * into the client component. All state + interaction lives in the client
 * component — this page only handles auth + metadata.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireB2BUser } from '@/lib/auth';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { BulkOrderTable } from '@/components/b2b/bulk-order-table';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'طلب مُجمَّع للشركات' : 'Bulk order',
    robots: { index: false, follow: false },
  };
}

export default async function B2BBulkOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireB2BUser();
  const { locale } = await params;
  const isAr = locale === 'ar';
  const b2b = await getB2BCheckoutContext();
  if (!b2b) redirect(`/${locale}/b2b/profile`);

  return (
    <main className="container-page max-w-6xl py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'شركات' : 'Business'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'طلب مُجمَّع' : 'Bulk order'}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {isAr
            ? 'أداة الطلب السريع: اكتب الكود أو اسم المنتج في كل صف، اختر من الاقتراحات، ثم حدّد الكمية. الأسعار المتفاوض عليها لشركتك تظهر فوراً، وفي الآخر اضغط "أضف الكل للسلة" لإكمال الطلب من السلة عادي.'
            : 'Quick-entry tool: type a SKU or product name on each row, pick from the suggestions, then set the quantity. Your company\'s negotiated prices show up instantly, and once you\'re done click "Add all to cart" to finish checkout normally.'}
        </p>
      </header>
      <BulkOrderTable
        locale={isAr ? 'ar' : 'en'}
        labels={{
          rowCap: isAr
            ? 'حد الإدخال: 50 صف لكل عملية.'
            : 'Entry cap: 50 rows per submission.',
          columns: {
            sku: isAr ? 'الكود / البحث' : 'SKU / search',
            name: isAr ? 'المنتج' : 'Product',
            unit: isAr ? 'سعر الوحدة' : 'Unit price',
            qty: isAr ? 'الكمية' : 'Qty',
            total: isAr ? 'الإجمالي' : 'Line total',
            actions: '',
          },
          placeholderQuery: isAr
            ? 'SKU أو اسم المنتج...'
            : 'SKU or product name…',
          skuNotLocked: isAr ? 'اختر منتج من الاقتراحات' : 'Pick a suggestion',
          availableLabel: isAr ? 'المتاح' : 'Available',
          overRequestWarning: isAr
            ? 'الكمية المطلوبة أكبر من المتاح ({available}).'
            : 'Requested qty exceeds available ({available}).',
          outOfStockWarning: isAr
            ? 'نفدت الكمية — اطلب كمية أقل أو انتظر التجديد.'
            : 'Out of stock — reduce qty or wait for restock.',
          addRow: isAr ? 'أضف صف' : 'Add row',
          duplicateLast: isAr ? 'كرّر آخر صف' : 'Duplicate last',
          clearAll: isAr ? 'امسح الكل' : 'Clear all',
          addAllToCart: isAr ? 'أضف الكل للسلة' : 'Add all to cart',
          addingToCart: isAr ? 'جارٍ الإضافة...' : 'Adding…',
          grandTotal: isAr ? 'الإجمالي' : 'Total',
          atLeastOne: isAr
            ? 'اختر منتج واحد على الأقل قبل الإضافة للسلة.'
            : 'Select at least one product before adding to cart.',
          remove: isAr ? 'حذف السطر' : 'Remove row',
          skippedHeader: isAr
            ? 'بعض الأسطر لم تُضَف:'
            : 'Some rows were skipped:',
          skippedReasons: {
            'cart.insufficient_stock': isAr
              ? 'الكمية المطلوبة غير متاحة'
              : 'Requested qty not available',
            'product.not_found_or_inactive': isAr
              ? 'المنتج غير موجود أو مؤرشف'
              : 'Product not found or archived',
          },
          successToastTemplate: isAr
            ? `تمت إضافة {count} صنف إلى السلة.`
            : `Added {count} items to your cart.`,
          tooManyRows: isAr
            ? 'الحد الأقصى 50 صفًا لكل عملية.'
            : 'Maximum 50 rows per batch.',
        }}
      />
    </main>
  );
}
