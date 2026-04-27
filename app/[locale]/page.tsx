import Image from 'next/image';
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
import { buildTree, type FlatCategory } from '@/lib/catalog/category-tree';
import { brandLogoUrl, categoryImageUrl } from '@/lib/storage/paths';

type TopCategory = {
  id: string;
  parentId: string | null;
  position: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  imageFilename: string | null;
};

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

  const [featured, categoryRows, brandRows] = await Promise.all([
    safely<ProductListItem[]>(
      'listActiveProducts',
      () =>
        listActiveProducts({ page: 1, sort: 'newest' }).then((r) =>
          r.items.slice(0, 8),
        ),
      [],
    ),
    safely<TopCategory[]>(
      'categories.findMany',
      () =>
        prisma.category.findMany({
          where: { status: 'ACTIVE' },
          orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
          select: {
            id: true,
            parentId: true,
            position: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            imageFilename: true,
          },
        }),
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
  ]);

  const flat: FlatCategory<TopCategory>[] = categoryRows.map((r) => ({ ...r }));
  const tree = buildTree(flat);
  const topCategories = tree.slice(0, 6);

  const valueProps = [
    {
      icon: ShieldCheck,
      title: isAr ? 'منتجات أصلية' : 'Authentic products',
      body: isAr
        ? 'حبر وتونر ومستلزمات أصلية، من غير تقليد.'
        : 'Genuine ink, toner, and supplies — no knockoffs.',
    },
    {
      icon: CreditCard,
      title: isAr ? 'الدفع عند الاستلام' : 'Cash on delivery',
      body: isAr
        ? 'أو ادفع بالبطاقة عبر بوابة آمنة.'
        : 'Or pay by card via a secure gateway.',
    },
    {
      icon: Truck,
      title: isAr ? 'شحن لكل المحافظات' : 'Nationwide delivery',
      body: isAr
        ? 'شحن سريع لـ 27 محافظة بأسعار واضحة.'
        : 'Fast delivery to all 27 governorates.',
    },
    {
      icon: MessageCircle,
      title: isAr ? 'دعم واتساب' : 'WhatsApp support',
      body: isAr
        ? 'فريق المبيعات متاح للإجابة عن أسئلتك.'
        : 'Sales team is a WhatsApp message away.',
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
                {/* The space between the plain text and the colored emphasis
                    sits INSIDE one of the spans (not as a bare {' '} sibling)
                    so the accessibility tree concatenates the heading with
                    a real space — `{' '}` between adjacent inline children
                    gets collapsed in some screen-reader engines. */}
                {isAr ? (
                  <>
                    {'طابعات وأحبار '}
                    <span className="text-accent-strong">أصلية</span>
                  </>
                ) : (
                  <>
                    <span className="text-accent-strong">{'Authentic '}</span>
                    printers and ink
                  </>
                )}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              {isAr
                ? 'ابحث برقم موديل الطابعة لإيجاد المستلزم المناسب تمامًا. توصيل سريع، دفع عند الاستلام، ودعم واتساب من فريقنا.'
                : 'Search by printer model to find the exact consumable. Fast delivery, cash on delivery, and WhatsApp support from our team.'}
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

      {/* ───────────────────────── Category rail ──────────────────────── */}
      {topCategories.length > 0 ? (
        <section className="container-page py-16">
          <SectionHead
            overline={isAr ? 'تصفح' : 'Browse'}
            title={isAr ? 'الفئات' : 'Shop by category'}
          />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCategories.map((cat) => {
              const imageUrl = cat.imageFilename
                ? categoryImageUrl(cat.imageFilename)
                : null;
              const name = isAr ? cat.nameAr : cat.nameEn;
              return (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    aria-label={name}
                    className={
                      imageUrl
                        ? 'group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-lg border border-border shadow-card transition-[transform,box-shadow,border-color] duration-base ease-out-smooth hover:-translate-y-0.5 hover:border-accent hover:shadow-popover'
                        : 'group flex aspect-[5/4] flex-col justify-between rounded-lg border border-border bg-paper p-4 shadow-card transition-[transform,box-shadow,border-color] duration-base ease-out-smooth hover:-translate-y-0.5 hover:border-accent hover:shadow-popover'
                    }
                  >
                    {imageUrl ? (
                      <>
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          className="object-cover transition-transform duration-slow ease-out-smooth group-hover:scale-[1.04]"
                          unoptimized
                        />
                        {/* Dark gradient overlay so the title stays readable
                            against any photo. Strongest at the bottom where
                            the label sits. */}
                        <span
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent"
                        />
                        <div className="relative p-4 text-canvas">
                          <p className="text-sm font-semibold drop-shadow">
                            {name}
                          </p>
                          <p className="mt-0.5 text-xs text-canvas/80">
                            {isAr ? 'استعرض' : 'Explore'}
                            <ArrowRight
                              className="ms-1 inline h-3 w-3 translate-x-0 transition-transform duration-base ease-out-smooth group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                          <Printer className="h-5 w-5" strokeWidth={1.75} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {isAr ? 'استعرض' : 'Explore'}
                            <ArrowRight
                              className="ms-1 inline h-3 w-3 translate-x-0 transition-transform duration-base ease-out-smooth group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </p>
                        </div>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ───────────────────────── Featured products ──────────────────── */}
      {featured.length > 0 ? (
        <section className="container-page border-t border-border py-16">
          <div className="mb-8 flex items-end justify-between gap-6">
            <SectionHead
              overline={isAr ? 'جديد' : 'Latest'}
              title={isAr ? 'أحدث المنتجات' : 'New arrivals'}
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
                {isAr ? 'بحث ذكي' : 'Smart search'}
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {isAr
                  ? 'تعرف على الخرطوشة الصحيحة لطابعتك.'
                  : 'Find the right cartridge for your printer.'}
              </h2>
              <p className="mt-4 max-w-xl text-base text-canvas/70">
                {isAr
                  ? 'اكتب موديل طابعتك — HP LaserJet، Canon PIXMA، Epson EcoTank — وسنعرض لك المستلزمات المتوافقة فقط.'
                  : 'Type your model — HP LaserJet, Canon PIXMA, Epson EcoTank — and we’ll show you only the consumables that actually fit.'}
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
                isAr ? 'HP LaserJet' : 'HP LaserJet',
                isAr ? 'Canon PIXMA' : 'Canon PIXMA',
                isAr ? 'Epson EcoTank' : 'Epson EcoTank',
                isAr ? 'Brother HL' : 'Brother HL',
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
