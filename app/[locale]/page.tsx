import Image from 'next/image';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  MessageCircle,
  Printer,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/catalog/product-card';
import { prisma } from '@/lib/db';
import {
  listActiveProducts,
  type ProductListItem,
} from '@/lib/catalog/queries';
import { brandLogoUrl } from '@/lib/storage/paths';

const HOMEPAGE_BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const title = isAr
    ? 'أحبار وتونر طابعات أصلية ومتوافقة | شحن لكل مصر | برينت باي فالكون'
    : 'Genuine & Compatible Printer Toner & Ink | Nationwide Egypt Delivery | Print By Falcon';
  const description = isAr
    ? 'اطلب أحبار، تونر، وخراطيش طابعات HP, Canon, Epson, Brother, Samsung — أصلية ومتوافقة. أسعار جملة للشركات، الدفع عند الاستلام، شحن لكل محافظات مصر خلال 1-5 أيام.'
    : 'Order printer ink, toner, and cartridges from HP, Canon, Epson, Brother, Samsung — genuine and compatible. Wholesale pricing for businesses, cash on delivery, nationwide Egypt shipping in 1-5 days.';
  return {
    title,
    description,
    alternates: {
      canonical: `${HOMEPAGE_BASE_URL}/${locale}`,
      languages: {
        ar: `${HOMEPAGE_BASE_URL}/ar`,
        en: `${HOMEPAGE_BASE_URL}/en`,
        'x-default': `${HOMEPAGE_BASE_URL}/ar`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${HOMEPAGE_BASE_URL}/${locale}`,
    },
  };
}

type BrandRow = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  logoFilename: string | null;
};

// Force dynamic rendering. Avoids any build-time SSG weirdness where the
// homepage might get pre-rendered against an empty build-context DB and
// bake a broken state into the bundle. ISR (`revalidate`) is kept so the
// runtime cache window is still 5 minutes.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

// Defensive wrapper — log and swallow errors so an individual DB failure
// degrades gracefully (empty section) instead of crashing the whole page.
async function safely<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(
      `[homepage] ${label} failed:`,
      err instanceof Error ? err.message : err,
      err instanceof Error && err.stack ? `\n${err.stack}` : '',
    );
    return fallback;
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const typedLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';

  const [featured, brandRows, topCategories] = await Promise.all([
    safely<ProductListItem[]>(
      'listActiveProducts',
      () =>
        // 24 featured products (was 8) — denser internal-link surface for
        // crawl-budget purposes. Mix recommended (popularity) instead of
        // newest so the rail stays useful when product turnover slows.
        listActiveProducts({ page: 1, sort: 'recommended' }).then((r) =>
          r.items.slice(0, 24),
        ),
      [],
    ),
    safely<BrandRow[]>(
      'brands.findMany',
      () =>
        prisma.brand.findMany({
          // Only brands that actually carry an active product. This filters
          // out polluted records left over from CSV imports where spec
          // values (".metres 3", ".1.5m", ".page yield 000") were
          // mis-parsed as brand names — they have no products and
          // shouldn't surface on the home rail.
          where: {
            status: 'ACTIVE',
            products: { some: { status: 'ACTIVE' } },
          },
          orderBy: { nameEn: 'asc' },
          select: {
            id: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            logoFilename: true,
          },
          take: 10,
        }),
      [],
    ),
    // Top-level categories with active products — surface them on the
    // homepage so Googlebot has one-hop reach from the most authoritative
    // URL on the site. Direct sub-cat links are picked up via the HTML
    // sitemap at /[locale]/sitemap.
    safely(
      'categories.top-level',
      () =>
        prisma.category.findMany({
          where: {
            status: 'ACTIVE',
            parentId: null,
            products: { some: { status: 'ACTIVE' } },
          },
          orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
          select: {
            id: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            _count: {
              select: { products: { where: { status: 'ACTIVE' } } },
            },
          },
          take: 12,
        }),
      [] as Array<{
        id: string;
        slug: string;
        nameAr: string;
        nameEn: string;
        _count: { products: number };
      }>,
    ),
  ]);

  const valueProps = [
    {
      icon: ShieldCheck,
      title: isAr ? 'جودة وأسعار منافسة' : 'Quality at fair prices',
      body: isAr
        ? 'منتجات مختارة بعناية، أصلية أو متوافقة، بأسعار واضحة وعروض جملة للشركات.'
        : 'Carefully selected products, genuine or compatible, at clear prices with wholesale pricing for businesses.',
    },
    {
      icon: CreditCard,
      title: isAr ? 'الدفع عند الاستلام' : 'Cash on delivery',
      body: isAr
        ? 'ادفع كاش لما يوصل، أو بالكارت عبر بوابة دفع آمنة.'
        : 'Pay cash on arrival, or by card via a secure payment gateway.',
    },
    {
      icon: Truck,
      title: isAr ? 'شحن سريع' : 'Fast shipping',
      body: isAr
        ? 'نوصّل لمعظم المناطق بسرعة، بأسعار شحن واضحة من أول طلب.'
        : 'Quick delivery covering most areas, with clear shipping rates from the first order.',
    },
    {
      icon: MessageCircle,
      title: isAr ? 'دعم مباشر' : 'Direct support',
      body: isAr
        ? 'فريقنا على واتساب يساعدك تختار المستلزم الصحيح لطابعتك.'
        : 'Our team on WhatsApp helps you pick the right consumable for your printer.',
    },
  ];

  return (
    <>
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent-soft))_0%,hsl(var(--canvas))_60%)]"
        />
        <div className="container-page grid gap-10 py-18 sm:py-22 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-30">
          <div className="flex flex-col justify-center">
            <h1 className="font-bold leading-[1.05] tracking-tight">
              {/* Wordmark — English brand name, always shown */}
              <span className="block text-4xl text-foreground sm:text-5xl lg:text-6xl">
                Print <span className="text-accent-strong">By Falcon</span>
              </span>
              {/* Localized tagline — emphasis word matches the Arabic
                  rhythm (last word in AR / first word in EN). */}
              <span className="mt-3 block text-3xl text-foreground sm:text-4xl lg:text-5xl">
                {isAr ? 'طابعات وأحبار' : 'Printers and ink'}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {isAr
                ? 'متجر مصري متخصص في الطابعات وأحبار التونر والإنكجت. منتجات مختارة، أسعار منافسة، ودعم مباشر يساعدك تختار اللي يناسب طابعتك.'
                : 'An Egypt-based store specialized in printers and ink supplies. Carefully selected products, competitive prices, and direct support to help you pick the right one for your printer.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/products">
                  {isAr ? 'تصفح الكتالوج' : 'Shop the catalog'}
                  <ArrowRight
                    className="ms-2 h-5 w-5 rtl:rotate-180"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">
                  <Search
                    className="me-2 h-5 w-5"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {isAr ? 'ابحث بموديل الطابعة' : 'Search by printer'}
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero visual — type-led composition, no stock imagery */}
          <div className="relative hidden items-center justify-center lg:flex">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-6 -z-10 rounded-2xl bg-accent-soft/60 blur-2xl" />
              <div className="rounded-2xl border border-border bg-paper p-8 shadow-popover">
                <div className="mb-6 flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <Printer
                    className="h-4 w-4 text-accent-strong"
                    strokeWidth={1.75}
                  />
                  {isAr ? 'ابحث بموديل' : 'Compatibility'}
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {isAr ? 'طابعتك:' : 'Your printer:'}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  HP LaserJet M404dn
                </p>
                <div className="my-6 h-px bg-border" />
                <p className="text-xs font-medium text-muted-foreground">
                  {isAr ? 'الخرطوشة المناسبة:' : 'Matching consumable:'}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  HP 59A <span className="text-muted-foreground">(CF259A)</span>
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {isAr ? 'متوفر' : 'In stock'}
                  </span>
                  <span className="num text-base font-semibold text-foreground">
                    EGP 3,450
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Value-prop strip ───────────────────── */}
      <section
        aria-label={isAr ? 'مميزات الشراء معنا' : 'Why shop with us'}
        className="border-b border-border bg-paper"
      >
        <div className="container-page grid gap-0 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((prop, i) => (
            <div
              key={prop.title}
              className={`flex items-start gap-3 px-4 py-4 sm:px-6 ${
                i > 0 ? 'sm:border-s sm:border-border' : ''
              } ${i > 1 ? 'lg:border-s lg:border-border' : ''}`}
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-canvas text-accent-strong">
                <prop.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {prop.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {prop.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Categories grid ────────────────────── */}
      {topCategories.length > 0 ? (
        <section className="container-page border-t border-border py-16">
          <div className="mb-8 flex items-end justify-between gap-6">
            <SectionHead
              overline={isAr ? 'تسوّق حسب' : 'Shop by'}
              title={isAr ? 'التصنيفات' : 'Categories'}
            />
            <Link
              href="/sitemap"
              className="text-sm font-medium text-accent-strong hover:underline"
            >
              {isAr ? 'كل التصنيفات' : 'All categories'}
              <ArrowRight
                className="ms-1 inline h-4 w-4 rtl:rotate-180"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {topCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border bg-canvas px-4 py-4 shadow-card transition-[border-color,box-shadow,transform] duration-base ease-out-smooth hover:-translate-y-0.5 hover:border-accent hover:shadow-popover"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {isAr ? c.nameAr : c.nameEn}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="num">{c._count.products}</span>{' '}
                    {isAr
                      ? 'منتج'
                      : c._count.products === 1
                        ? 'product'
                        : 'products'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───────────────────────── Featured products ──────────────────── */}
      {featured.length > 0 ? (
        <section className="container-page border-t border-border py-16">
          <div className="mb-8 flex items-end justify-between gap-6">
            <SectionHead
              overline={isAr ? 'موصى به' : 'Recommended'}
              title={isAr ? 'منتجات مختارة' : 'Featured products'}
            />
            <Link
              href="/products"
              className="text-sm font-medium text-accent-strong hover:underline"
            >
              {isAr ? 'الكل' : 'View all'}
              <ArrowRight
                className="ms-1 inline h-4 w-4 rtl:rotate-180"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={typedLocale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───────────────────────── Brand rail ─────────────────────────── */}
      {brandRows.length > 0 ? (
        <section className="border-t border-border bg-paper">
          <div className="container-page py-12">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isAr ? 'علامات تجارية نتعامل معها' : 'Brands we carry'}
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {brandRows.map((brand) => {
                const logoUrl = brand.logoFilename
                  ? brandLogoUrl(brand.logoFilename)
                  : null;
                const name = isAr ? brand.nameAr : brand.nameEn;
                return (
                  <li key={brand.id}>
                    <Link
                      href={`/products?brand=${brand.slug}`}
                      aria-label={name}
                      className="group flex h-14 min-w-[112px] items-center justify-center gap-2.5 rounded-lg border border-border bg-canvas px-4 text-sm font-medium text-foreground shadow-card transition-[border-color,box-shadow,transform] duration-base ease-out-smooth hover:-translate-y-0.5 hover:border-accent hover:shadow-popover"
                    >
                      {logoUrl ? (
                        <span className="relative inline-flex h-6 w-16 shrink-0 items-center justify-center">
                          <Image
                            src={logoUrl}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-contain"
                            unoptimized
                          />
                        </span>
                      ) : null}
                      <span
                        className={
                          logoUrl
                            ? 'text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-colors group-hover:text-foreground'
                            : 'text-sm font-semibold capitalize text-foreground'
                        }
                      >
                        {name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ───────────────────── Compatibility lookup CTA ───────────────── */}
      <section className="container-page py-20">
        <div className="relative overflow-hidden rounded-xl border border-border bg-ink p-10 text-canvas sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-soft/80">
                {isAr ? 'ابحث بموديل' : 'By model'}
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {isAr
                  ? 'اعرف الخرطوشة الصح لطابعتك.'
                  : 'Find the right cartridge for your printer.'}
              </h2>
              <p className="mt-4 max-w-xl text-base text-canvas/70">
                {isAr
                  ? 'اكتب موديل طابعتك (مثلاً HP LaserJet M404 أو Canon LBP6030) وهنعرض لك المستلزمات اللي بتركّب عليها — بس.'
                  : 'Type your model (e.g. HP LaserJet M404 or Canon LBP6030) and we’ll show you only the consumables that actually fit.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link href="/search">
                    <Search
                      className="me-2 h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {isAr ? 'ابدأ البحث' : 'Start searching'}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="text-canvas hover:bg-canvas/10 hover:text-canvas"
                >
                  <Link href="/products">
                    {isAr ? 'تصفح الكل' : 'Browse everything'}
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm lg:justify-self-end">
              {[
                'HP LaserJet',
                'Canon i-SENSYS',
                'Samsung Xpress',
                'Brother DCP',
              ].map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-md border border-canvas/15 bg-canvas/5 px-3 py-2 text-canvas/80"
                >
                  <Printer
                    className="h-4 w-4 text-accent-soft"
                    strokeWidth={1.75}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ overline, title }: { overline: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
        {overline}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
