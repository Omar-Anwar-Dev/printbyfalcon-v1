import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import { PricingTierBadge } from '@/components/b2b/pricing-tier-badge';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams?: Promise<{ sort?: string; status?: string }>;
};

export default async function AdminB2BCompaniesPage({
  params,
  searchParams,
}: Props) {
  await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isAr = locale === 'ar';

  const statusFilter = sp.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

  const sort = sp.sort === 'revenue' ? 'revenue' : 'recent';

  const companies = await prisma.company.findMany({
    where: { status: statusFilter },
    orderBy: sort === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    include: {
      pricingTier: {
        select: { code: true, defaultDiscountPercent: true },
      },
      primaryUser: {
        select: { name: true, email: true, lastLoginAt: true },
      },
      _count: { select: { orders: true, priceOverrides: true } },
    },
    take: 200,
  });

  // Aggregate per-company revenue in one roundtrip so we can show "revenue
  // to date" even though we sort primarily by recency.
  const revenue = await prisma.order.groupBy({
    by: ['companyId'],
    where: {
      companyId: { in: companies.map((c) => c.id) },
      paymentStatus: { in: ['PAID', 'PENDING_ON_DELIVERY'] },
    },
    _sum: { totalEgp: true },
  });
  const revenueByCompany = new Map(
    revenue.map((r) => [r.companyId, r._sum.totalEgp?.toString() ?? '0']),
  );

  const ordered =
    sort === 'revenue'
      ? [...companies].sort(
          (a, b) =>
            Number(revenueByCompany.get(b.id) ?? 0) -
            Number(revenueByCompany.get(a.id) ?? 0),
        )
      : companies;

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAr ? 'حسابات الشركات' : 'B2B companies'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'جميع حسابات الشركات المعتمدة. اضغط على أي شركة لتعديل المستوى وشروط الدفع والأسعار الخاصة.'
              : 'All approved business accounts. Click any company to update tier, credit terms, and per-SKU overrides.'}
          </p>
        </div>
        <Link
          href="/admin/b2b/applications"
          className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'طلبات الشركات' : 'Applications'}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b pb-3">
        <Chip
          href={`/admin/b2b/companies?status=ACTIVE&sort=${sort}`}
          active={statusFilter === 'ACTIVE'}
          label={isAr ? 'نشطة' : 'Active'}
        />
        <Chip
          href={`/admin/b2b/companies?status=SUSPENDED&sort=${sort}`}
          active={statusFilter === 'SUSPENDED'}
          label={isAr ? 'موقوفة' : 'Suspended'}
        />
        <span className="mx-2 text-muted-foreground">·</span>
        <Chip
          href={`/admin/b2b/companies?status=${statusFilter}&sort=recent`}
          active={sort === 'recent'}
          label={isAr ? 'الأحدث' : 'Recent'}
        />
        <Chip
          href={`/admin/b2b/companies?status=${statusFilter}&sort=revenue`}
          active={sort === 'revenue'}
          label={isAr ? 'حسب الإيرادات' : 'By revenue'}
        />
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {isAr ? 'لا توجد حسابات شركات بعد.' : 'No companies yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase">
                <th className="px-3 py-2 text-start">
                  {isAr ? 'الشركة' : 'Company'}
                </th>
                <th className="px-3 py-2 text-start">
                  {isAr ? 'المستوى' : 'Tier'}
                </th>
                <th className="px-3 py-2 text-start">
                  {isAr ? 'شروط الدفع' : 'Terms'}
                </th>
                <th className="px-3 py-2 text-end">
                  {isAr ? 'عدد الطلبات' : 'Orders'}
                </th>
                <th className="px-3 py-2 text-end">
                  {isAr ? 'الإيرادات' : 'Revenue'}
                </th>
                <th className="px-3 py-2 text-end">
                  {isAr ? 'أسعار مخصّصة' : 'Overrides'}
                </th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/b2b/companies/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.nameAr}
                    </Link>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {c.primaryUser.email}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <PricingTierBadge
                      code={c.pricingTier.code}
                      defaultDiscountPercent={
                        c.pricingTier.defaultDiscountPercent?.toString() ?? null
                      }
                      locale={locale}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {creditTermsShort(c.creditTerms, locale)}
                  </td>
                  <td className="px-3 py-2 text-end">{c._count.orders}</td>
                  <td className="px-3 py-2 text-end font-mono">
                    {formatEgp(revenueByCompany.get(c.id) ?? '0', locale)}
                  </td>
                  <td className="px-3 py-2 text-end">
                    {c._count.priceOverrides}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'border border-input bg-background hover:bg-muted'
      }`}
    >
      {label}
    </Link>
  );
}

function creditTermsShort(
  terms: 'NONE' | 'NET_15' | 'NET_30' | 'CUSTOM',
  locale: 'ar' | 'en',
): string {
  if (locale === 'ar') {
    return terms === 'NONE'
      ? 'فوري'
      : terms === 'NET_15'
        ? 'أجل 15 يوم'
        : terms === 'NET_30'
          ? 'أجل 30 يوم'
          : 'شروط خاصة';
  }
  return terms === 'NONE'
    ? 'Pay on order'
    : terms === 'NET_15'
      ? 'Net 15'
      : terms === 'NET_30'
        ? 'Net 30'
        : 'Custom';
}
