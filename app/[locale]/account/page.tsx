import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { User, MapPin, Package, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'حسابي' : 'My account',
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/sign-in`);
  // B2B users live under their company profile, not the personal account
  // page; send them there so order history is company-wide by default.
  if (user.type === 'B2B') redirect(`/${locale}/b2b/profile`);
  if (user.type !== 'B2C') redirect(`/${locale}`);

  const [addresses, orders] = await Promise.all([
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalEgp: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <main className="container-page max-w-4xl py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'حسابي' : 'Account'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? `أهلًا، ${user.name}` : `Hi, ${user.name}`}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isAr
            ? 'بياناتك، عناوينك، وتاريخ طلباتك — كلها هنا.'
            : 'Your details, addresses, and order history — all in one place.'}
        </p>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-paper p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <User className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {isAr ? 'بياناتي' : 'My details'}
        </h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">{isAr ? 'الاسم' : 'Name'}</dt>
          <dd className="font-medium text-foreground">{user.name}</dd>
          <dt className="text-muted-foreground">
            {isAr ? 'الموبايل' : 'Phone'}
          </dt>
          <dd className="num font-mono text-foreground">{user.phone ?? '—'}</dd>
          <dt className="text-muted-foreground">
            {isAr ? 'البريد الإلكتروني' : 'Email'}
          </dt>
          <dd className="text-foreground">{user.email ?? '—'}</dd>
        </dl>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-paper p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {isAr ? 'عناويني' : 'My addresses'}
          </h2>
          <Link
            href="/account/addresses"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:text-accent"
          >
            {isAr ? 'إدارة' : 'Manage'}
            <ArrowRight
              className="h-3.5 w-3.5 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لم تضف عنوانًا بعد.' : 'No addresses yet.'}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {addresses.slice(0, 3).map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {a.recipientName}
                  </span>
                  {a.isDefault ? (
                    <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">
                      {isAr ? 'افتراضي' : 'Default'}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.street}, {a.city} — {a.governorate}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-paper p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {isAr ? 'طلباتي' : 'My orders'}
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-md border border-border bg-background p-8 text-center text-sm">
            <p className="font-medium text-foreground">
              {isAr ? 'لم تطلب شيئًا بعد.' : 'No orders yet.'}
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
            >
              {isAr ? 'ابدأ التسوق' : 'Start shopping'}
              <ArrowRight
                className="h-3.5 w-3.5 rtl:rotate-180"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="num font-mono font-semibold text-foreground transition-colors hover:text-accent-strong"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}
                    {' · '}
                    <span className="font-medium">{o.status}</span> ·{' '}
                    {o.paymentStatus}
                  </p>
                </div>
                <span className="num shrink-0 whitespace-nowrap font-semibold text-foreground">
                  {formatEgp(o.totalEgp.toString(), isAr ? 'ar' : 'en')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
