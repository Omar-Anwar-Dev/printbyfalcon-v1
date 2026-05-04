import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import {
  getActiveProductBySlug,
  listActiveProducts,
} from '@/lib/catalog/queries';
import { ProductGallery } from '@/components/catalog/product-gallery';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductPrice } from '@/components/catalog/product-price';
import { StockBadge } from '@/components/catalog/stock-badge';
import {
  getAvailableQtyExact,
  getStockStatusForProduct,
} from '@/lib/catalog/stock';
import { AddToCartButton } from '@/components/catalog/add-to-cart-button';
import { resolveViewerPrices } from '@/lib/pricing/storefront';
import { getOptionalUser } from '@/lib/auth';
import { getPricingContextForUser } from '@/lib/pricing/context';
import { resolvePrice } from '@/lib/pricing/resolve';
import { JsonLd } from '@/components/seo/json-ld';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';

// Dynamic so B2B tier pricing + exact stock qty render per viewer.
export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return {};
  const isAr = locale === 'ar';
  const name = isAr ? product.nameAr : product.nameEn;
  const brandName = isAr ? product.brand.nameAr : product.brand.nameEn;
  const priceEgp = Number(product.basePriceEgp.toString()).toFixed(0);
  const priceLabel = isAr ? `${priceEgp} ج.م` : `${priceEgp} EGP`;
  // Title is the most weighted SEO signal — include brand + price + a value cue.
  // Keep under ~60 chars total when rendered (template adds " | Print By Falcon").
  const title = isAr ? `${name} — ${priceLabel}` : `${name} — ${priceLabel}`;
  // Description gets brand + price + delivery + USP. Keep under 160 chars.
  const baseDescription = (isAr ? product.descriptionAr : product.descriptionEn)
    .slice(0, 110)
    .trim();
  const description = isAr
    ? `${baseDescription} السعر ${priceLabel}. شحن لكل محافظات مصر، الدفع عند الاستلام.`
    : `${baseDescription} Priced at ${priceLabel}. Nationwide Egypt shipping, cash on delivery.`;
  const image = product.images[0]?.medium;
  return {
    title,
    description,
    keywords: [
      name,
      brandName,
      product.sku,
      isAr ? 'طابعة' : 'printer',
      isAr ? 'تونر' : 'toner',
      isAr ? 'حبر' : 'ink',
      isAr ? 'مصر' : 'Egypt',
    ],
    alternates: {
      canonical: `${BASE_URL}/${locale}/products/${product.slug}`,
      languages: {
        ar: `${BASE_URL}/ar/products/${product.slug}`,
        en: `${BASE_URL}/en/products/${product.slug}`,
      },
    },
    openGraph: {
      title: name,
      description,
      type: 'website',
      url: `${BASE_URL}/${locale}/products/${product.slug}`,
      images: image ? [{ url: `${BASE_URL}${image}` }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: name,
      description,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const isAr = locale === 'ar';
  const t = await getTranslations();
  const name = isAr ? product.nameAr : product.nameEn;
  const description = isAr ? product.descriptionAr : product.descriptionEn;
  const brandName = isAr ? product.brand.nameAr : product.brand.nameEn;
  const categoryName = isAr ? product.category.nameAr : product.category.nameEn;

  // Related products: same category, excluding this one, up to 4.
  const related = await listActiveProducts({
    categoryId: product.categoryId,
    page: 1,
  });
  const relatedItems = related.items
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  // Resolve pricing for the current viewer. The detail-page price uses the
  // same source of truth as the list page so the displayed price is stable
  // across the browse → detail transition.
  const viewer = await getOptionalUser();
  const pricingCtx = await getPricingContextForUser(viewer);
  const resolvedDetail = resolvePrice(product, pricingCtx);
  const displayPriceEgp = resolvedDetail.finalPriceEgp.toString();
  const basePriceEgpStr = product.basePriceEgp.toString();
  const { priceById: relatedPriceById } =
    await resolveViewerPrices(relatedItems);

  // Sprint 14 — bilingual specs with legacy-fallback. specsAr/specsEn ship
  // per-locale; if the locale-specific bag is empty, fall back to the legacy
  // `specs` (single language, populated pre-Sprint-14) so existing products
  // keep displaying spec data without owner action.
  function asRecord(v: unknown): Record<string, string> {
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, string>)
      : {};
  }
  const localizedSpecs = isAr
    ? asRecord(product.specsAr)
    : asRecord(product.specsEn);
  const legacySpecs = asRecord(product.specs);
  const specs =
    Object.keys(localizedSpecs).length > 0 ? localizedSpecs : legacySpecs;

  const stockStatus =
    product.status === 'ACTIVE'
      ? await getStockStatusForProduct(product.id)
      : 'OUT_OF_STOCK';
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK';
  // B2B users see the exact available qty so procurement can commit to the
  // right PO size without ping-ponging with sales (PRD Feature 1).
  const exactStockQty =
    viewer?.type === 'B2B' && product.status === 'ACTIVE'
      ? await getAvailableQtyExact(product.id)
      : null;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: product.sku,
    name,
    description,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    category: categoryName,
    image: product.images.map((img) => `${BASE_URL}${img.medium}`),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EGP',
      // Schema.org Offer price reflects the list price (public SEO).
      // B2B-specific pricing is negotiated + not shown to anonymous crawlers.
      price: Number(basePriceEgpStr).toFixed(2),
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: `${BASE_URL}/${locale}/products/${product.slug}`,
    },
  };

  // Sprint 13 — BreadcrumbList for the SERP breadcrumb trail (lifts CTR).
  const breadcrumbSchema = buildBreadcrumbList([
    { name: t('nav.home'), path: `/${locale}` },
    { name: t('nav.catalog'), path: `/${locale}/products` },
    {
      name: categoryName,
      path: `/${locale}/categories/${product.category.slug}`,
    },
    { name, path: `/${locale}/products/${product.slug}` },
  ]);

  return (
    <main className="container-page py-8 md:py-12">
      <JsonLd data={[productSchema, breadcrumbSchema]} id="product-schema" />
      <nav
        aria-label={isAr ? 'المسار' : 'Breadcrumbs'}
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="transition-colors hover:text-foreground">
          {t('nav.home')}
        </Link>
        <span className="text-border">/</span>
        <Link
          href="/products"
          className="transition-colors hover:text-foreground"
        >
          {t('nav.catalog')}
        </Link>
        <span className="text-border">/</span>
        <Link
          href={`/categories/${product.category.slug}`}
          className="transition-colors hover:text-foreground"
        >
          {categoryName}
        </Link>
        <span className="text-border">/</span>
        <span className="truncate text-foreground">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <ProductGallery
          images={product.images}
          locale={isAr ? 'ar' : 'en'}
          productName={name}
        />

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
              {brandName}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {name}
            </h1>
            <p className="num mt-1.5 font-mono text-xs text-muted-foreground">
              SKU: {product.sku}
            </p>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <ProductPrice
              finalPriceEgp={displayPriceEgp}
              basePriceEgp={basePriceEgpStr}
              locale={isAr ? 'ar' : 'en'}
              className="text-3xl"
              listPriceClassName="text-sm"
            />
            {product.authenticity === 'COMPATIBLE' ? (
              <span className="rounded-full border border-border bg-paper px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {isAr ? 'متوافق' : 'Compatible'}
              </span>
            ) : (
              <span className="rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                {isAr ? 'أصلي' : 'Genuine'}
              </span>
            )}
            {product.condition === 'USED' ? (
              <span className="rounded-full border border-warning/20 bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                {isAr ? 'مستعمل' : 'Used'}
              </span>
            ) : null}
            {resolvedDetail.source === 'tier' ? (
              <span className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                {isAr
                  ? `سعر المستوى ${pricingCtx.tier?.code}`
                  : `Tier ${pricingCtx.tier?.code} pricing`}
              </span>
            ) : resolvedDetail.source === 'override' ? (
              <span className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                {isAr ? 'سعر متفق عليه' : 'Negotiated price'}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={stockStatus} locale={isAr ? 'ar' : 'en'} />
            {exactStockQty != null && exactStockQty > 0 ? (
              <span
                className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong"
                dir={isAr ? 'rtl' : 'ltr'}
                title={
                  isAr
                    ? 'الكمية الفعلية المتاحة بعد خصم حجوزات العربات والطلبات'
                    : 'Exact available qty (reservations subtracted)'
                }
              >
                {isAr
                  ? `${exactStockQty} وحدة متاحة`
                  : `${exactStockQty} units available`}
              </span>
            ) : null}
          </div>

          {isOutOfStock ? (
            <p className="rounded-md border border-border bg-paper p-3 text-sm text-muted-foreground">
              {isAr
                ? 'هذا المنتج غير متاح حاليًا. تواصل معنا للاستفسار عن موعد التوفر.'
                : 'This product is currently unavailable. Contact us for restock timing.'}
            </p>
          ) : (
            <AddToCartButton
              productId={product.id}
              locale={isAr ? 'ar' : 'en'}
            />
          )}

          {description ? (
            <div className="mt-2 border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {isAr ? 'الوصف' : 'Description'}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {description}
              </p>
            </div>
          ) : null}

          {product.warranty ||
          (product.condition === 'USED' && product.conditionNote) ? (
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {isAr ? 'الضمان والحالة' : 'Warranty & condition'}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                {product.warranty ? (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="font-medium text-muted-foreground">
                      {isAr ? 'الضمان:' : 'Warranty:'}
                    </dt>
                    <dd className="text-foreground">{product.warranty}</dd>
                  </div>
                ) : null}
                {product.condition === 'USED' && product.conditionNote ? (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="font-medium text-muted-foreground">
                      {isAr ? 'حالة المنتج:' : 'Condition:'}
                    </dt>
                    <dd className="text-foreground">{product.conditionNote}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {Object.keys(specs).length > 0 ? (
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {isAr ? 'المواصفات' : 'Specifications'}
              </h2>
              <dl className="mt-3 overflow-hidden rounded-md border border-border text-sm">
                {Object.entries(specs).map(([key, value], idx, arr) => (
                  <div
                    key={key}
                    className={`grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-4 py-2.5 ${
                      idx % 2 === 0 ? 'bg-paper' : 'bg-background'
                    } ${idx < arr.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <dt className="break-words font-medium text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="break-words text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {product.compatiblePrinters.length > 0 ? (
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {isAr ? 'طابعات متوافقة' : 'Compatible printers'}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {product.compatiblePrinters.map((pm) => (
                  <li key={pm.id}>
                    <Link
                      href={{
                        pathname: '/search',
                        query: { printer: pm.slug },
                      }}
                      className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-accent hover:bg-accent-soft"
                      title={
                        isAr
                          ? `كل المستلزمات المتوافقة مع ${isAr ? pm.brandAr : pm.brandEn} ${pm.modelName}`
                          : `All consumables compatible with ${pm.brandEn} ${pm.modelName}`
                      }
                    >
                      <span className="text-muted-foreground">
                        {isAr ? pm.brandAr : pm.brandEn}
                      </span>
                      <span className="font-semibold text-foreground">
                        {pm.modelName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {relatedItems.length > 0 ? (
        <section className="mt-16 border-t border-border pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {isAr ? 'اكتشف المزيد' : 'Discover more'}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {isAr ? 'منتجات ذات صلة' : 'Related products'}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {relatedItems.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  locale={isAr ? 'ar' : 'en'}
                  finalPriceEgp={relatedPriceById.get(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
