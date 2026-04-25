import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import { PricingTierBadge } from '@/components/b2b/pricing-tier-badge';
import { CompanyTermsForm } from '@/components/admin/company-terms-form';
import { CompanyPriceOverrides } from '@/components/admin/company-price-overrides';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en'; id: string }>;
};

export default async function AdminCompanyDetailPage({ params }: Props) {
  await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      pricingTier: { select: { code: true, defaultDiscountPercent: true } },
      primaryUser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastLoginAt: true,
        },
      },
      priceOverrides: {
        include: {
          product: {
            select: {
              sku: true,
              nameAr: true,
              nameEn: true,
              basePriceEgp: true,
              status: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          totalEgp: true,
          contactName: true,
        },
      },
    },
  });
  if (!company) notFound();

  const revenue = company.orders.reduce(
    (sum, o) =>
      o.paymentStatus === 'PAID' || o.paymentStatus === 'PENDING_ON_DELIVERY'
        ? sum + Number(o.totalEgp)
        : sum,
    0,
  );

  return (
    <main className="container-page space-y-6 py-8">
      <div>
        <nav className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/b2b/companies" className="hover:underline">
            {isAr ? 'حسابات الشركات' : 'Companies'}
          </Link>
          <span>/</span>
          <span className="text-foreground">{company.nameAr}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {company.nameAr}
          </h1>
          <PricingTierBadge
            code={company.pricingTier.code}
            defaultDiscountPercent={
              company.pricingTier.defaultDiscountPercent?.toString() ?? null
            }
            locale={locale}
          />
          {company.status === 'SUSPENDED' ? (
            <span className="rounded-full bg-error-soft px-2.5 py-1 text-xs font-medium text-error">
              {isAr ? 'موقوف' : 'Suspended'}
            </span>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
        <Kv label={isAr ? 'س.ت' : 'CR #'} value={company.crNumber} />
        <Kv label={isAr ? 'ب.ض' : 'Tax card #'} value={company.taxCardNumber} />
        <Kv
          label={isAr ? 'جهة الاتصال' : 'Primary contact'}
          value={`${company.primaryUser.name} (${company.primaryUser.email})`}
          dir="ltr"
        />
        <Kv
          label={isAr ? 'الموبايل' : 'Phone'}
          value={company.primaryUser.phone ?? '—'}
          dir="ltr"
        />
        <Kv
          label={isAr ? 'إجمالي الإيرادات' : 'Lifetime revenue'}
          value={formatEgp(revenue.toFixed(2), locale)}
        />
        <Kv
          label={isAr ? 'آخر تسجيل دخول' : 'Last login'}
          value={
            company.primaryUser.lastLoginAt
              ? new Date(company.primaryUser.lastLoginAt).toLocaleString(
                  isAr ? 'ar-EG' : 'en-US',
                )
              : '—'
          }
        />
      </section>

      <CompanyTermsForm
        companyId={company.id}
        initial={{
          pricingTierCode: company.pricingTier.code,
          creditTerms: company.creditTerms,
          creditLimitEgp: company.creditLimitEgp?.toString() ?? null,
          status: company.status,
          checkoutPolicy: company.checkoutPolicy,
        }}
        locale={locale}
      />

      <CompanyPriceOverrides
        companyId={company.id}
        tierCode={company.pricingTier.code}
        overrides={company.priceOverrides.map((o) => ({
          id: o.id,
          sku: o.product.sku,
          productNameAr: o.product.nameAr,
          productNameEn: o.product.nameEn,
          basePriceEgp: formatEgp(o.product.basePriceEgp.toString(), locale),
          customPriceEgp: formatEgp(o.customPriceEgp.toString(), locale),
        }))}
        locale={locale}
      />

      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">
          {isAr ? 'أحدث الطلبات' : 'Recent orders'}
        </h2>
        {company.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لا توجد طلبات بعد.' : 'No orders yet.'}
          </p>
        ) : (
          <ul className="divide-y">
            {company.orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-mono text-sm hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {o.contactName} · {o.status}
                </span>
                <span className="font-mono text-sm">
                  {formatEgp(o.totalEgp.toString(), locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Kv({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm" dir={dir}>
        {value}
      </dd>
    </div>
  );
}
