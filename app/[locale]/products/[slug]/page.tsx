import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import {
  getActiveProductBySlug,
  listActiveProducts,
} from '@/lib/catalog/queries';
import { formatEgp } from '@/lib/catalog/price';
import { ProductGallery } from '@/components/catalog/product-gallery';
import { ProductCard } from '@/components/catalog/product-card';

export const revalidate = 300;

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
  const description =
    (isAr ? product.descriptionAr : product.descriptionEn).slice(0, 200) ||
    (isAr ? product.nameAr : product.nameEn);
  const image = product.images[0]?.medium;
  return {
    title: name,
    description,
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

  const specs =
    product.specs &&
    typeof product.specs === 'object' &&
    !Array.isArray(product.specs)
      ? (product.specs as Record<string, string>)
      : {};

  const jsonLd = {
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
      price: Number(product.basePriceEgp).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/${locale}/products/${product.slug}`,
    },
  };

  return (
    <div className="container py-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- JSON.stringify of a server-built object; schema.org requires a raw <script> payload
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          {t('nav.home')}
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:underline">
          {t('nav.catalog')}
        </Link>
        <span>/</span>
        <Link
          href={`/categories/${product.category.slug}`}
          className="hover:underline"
        >
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          images={product.images}
          locale={isAr ? 'ar' : 'en'}
          productName={name}
        />

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{brandName}</p>
          <h1 className="text-2xl font-semibold md:text-3xl">{name}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            SKU: {product.sku}
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatEgp(product.basePriceEgp.toString(), isAr ? 'ar' : 'en')}
            </span>
            {product.authenticity === 'COMPATIBLE' ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {isAr ? 'متوافق' : 'Compatible'}
              </span>
            ) : (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {isAr ? 'أصلي' : 'Genuine'}
              </span>
            )}
          </div>

          {/* Stock status: placeholder until Sprint 6 inventory lands. */}
          <p className="text-sm text-green-700">
            {isAr ? 'متوفر حاليًا' : 'In stock'}
          </p>

          {/* Add-to-cart: placeholder until Sprint 4 cart lands. */}
          <button
            type="button"
            disabled
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground opacity-60"
            aria-disabled
            title={isAr ? 'قريبًا' : 'Coming soon'}
          >
            {isAr ? 'أضف إلى السلة' : 'Add to cart'}
          </button>

          {description ? (
            <div className="prose prose-sm mt-6 max-w-none">
              <h2 className="text-base font-semibold">
                {isAr ? 'الوصف' : 'Description'}
              </h2>
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ) : null}

          {Object.keys(specs).length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-2 text-base font-semibold">
                {isAr ? 'المواصفات' : 'Specifications'}
              </h2>
              <dl className="overflow-hidden rounded-md border text-sm">
                {Object.entries(specs).map(([key, value], idx, arr) => (
                  <div
                    key={key}
                    className={`grid grid-cols-[1fr_2fr] gap-2 px-3 py-2 ${idx < arr.length - 1 ? 'border-b' : ''}`}
                  >
                    <dt className="font-medium text-muted-foreground">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {product.compatiblePrinters.length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-2 text-base font-semibold">
                {isAr ? 'طابعات متوافقة' : 'Compatible printers'}
              </h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {product.compatiblePrinters.map((pm) => (
                  <li
                    key={pm.id}
                    className="rounded-md border bg-background px-3 py-1"
                  >
                    <span className="text-muted-foreground">
                      {isAr ? pm.brandAr : pm.brandEn}
                    </span>{' '}
                    <span className="font-medium">{pm.modelName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {relatedItems.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">
            {isAr ? 'منتجات ذات صلة' : 'Related products'}
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedItems.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={isAr ? 'ar' : 'en'} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
