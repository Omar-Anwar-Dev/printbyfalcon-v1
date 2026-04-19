import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
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
  if (!user || user.type !== 'B2C') redirect(`/${locale}/sign-in`);

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
    <div className="container max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'حسابي' : 'My account'}
      </h1>

      <section className="mb-6 rounded-md border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isAr ? 'بياناتي' : 'My details'}
          </h2>
        </div>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{isAr ? 'الاسم' : 'Name'}</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">
            {isAr ? 'الموبايل' : 'Phone'}
          </dt>
          <dd className="font-mono">{user.phone ?? '—'}</dd>
          <dt className="text-muted-foreground">
            {isAr ? 'البريد الإلكتروني' : 'Email'}
          </dt>
          <dd>{user.email ?? '—'}</dd>
        </dl>
      </section>

      <section className="mb-6 rounded-md border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isAr ? 'عناويني' : 'My addresses'}
          </h2>
          <Link
            href="/account/addresses"
            className="text-sm text-primary hover:underline"
          >
            {isAr ? 'إدارة' : 'Manage'} →
          </Link>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لم تضف عنوانًا بعد.' : 'No addresses yet.'}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {addresses.slice(0, 3).map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.recipientName}</span>
                {a.isDefault ? (
                  <span className="ms-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {isAr ? 'افتراضي' : 'Default'}
                  </span>
                ) : null}
                <span className="block text-muted-foreground">
                  {a.street}, {a.city} — {a.governorate}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'طلباتي' : 'My orders'}
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لم تطلب شيئًا بعد.' : 'No orders yet.'}
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}
                    {' · '}
                    {o.status} · {o.paymentStatus}
                  </span>
                </div>
                <span className="font-semibold">
                  {formatEgp(o.totalEgp.toString(), isAr ? 'ar' : 'en')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
