import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Package, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import { Pagination } from '@/components/ui/pagination';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'طلباتي' : 'My orders',
    robots: { index: false, follow: false },
  };
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function AccountOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/sign-in`);
  // B2B users see company-wide history under their company profile.
  if (user.type === 'B2B') redirect(`/${locale}/b2b/profile`);
  if (user.type !== 'B2C') redirect(`/${locale}`);

  const page = parsePage(sp.page);
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalEgp: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where: { userId: user.id } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="container-page max-w-4xl py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'حسابي' : 'Account'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'طلباتي' : 'My orders'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="num">{total}</span>{' '}
          {isAr
            ? total === 1
              ? 'طلب'
              : 'طلب'
            : total === 1
              ? 'order'
              : 'orders'}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-paper p-10 text-center">
          <Package
            className="mx-auto h-10 w-10 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-4 text-base font-semibold text-foreground">
            {isAr ? 'لم تطلب شيئًا بعد.' : 'No orders yet.'}
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            {isAr ? 'ابدأ التسوق' : 'Start shopping'}
            <ArrowRight
              className="h-4 w-4 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
          {orders.map((o, i) => (
            <li
              key={o.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/account/orders/${o.id}`}
                  className="num font-mono text-sm font-semibold text-foreground transition-colors hover:text-accent-strong"
                >
                  {o.orderNumber}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}
                  {' · '}
                  <span className="font-medium">{o.status}</span> ·{' '}
                  {o.paymentStatus}
                </p>
              </div>
              <span className="num shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                {formatEgp(o.totalEgp.toString(), isAr ? 'ar' : 'en')}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        locale={isAr ? 'ar' : 'en'}
        hrefForPage={(p) => ({
          pathname: '/account/orders',
          query: { page: String(p) },
        })}
      />
    </main>
  );
}
