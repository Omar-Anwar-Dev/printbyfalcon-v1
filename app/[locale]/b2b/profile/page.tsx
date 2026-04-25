import { redirect } from 'next/navigation';
import { requireB2BUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import { PricingTierBadge } from '@/components/b2b/pricing-tier-badge';
import { B2BProfileContactForm } from '@/components/b2b/b2b-profile-contact-form';
import { LogoutButton } from '@/components/auth/logout-button';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
};

export default async function B2BProfilePage({ params }: Props) {
  const user = await requireB2BUser();
  const { locale } = await params;
  const isAr = locale === 'ar';

  const company = await prisma.company.findUnique({
    where: { primaryUserId: user.id },
    include: {
      pricingTier: { select: { code: true, defaultDiscountPercent: true } },
      _count: { select: { orders: true, priceOverrides: true } },
    },
  });

  // Defensive: a B2B user without a Company row should be rare (only if the
  // admin deleted the Company but kept the User) — punt them to the catalog.
  if (!company) redirect(`/${locale}`);

  const lifetimeRevenue = await prisma.order.aggregate({
    where: {
      companyId: company.id,
      paymentStatus: { in: ['PAID', 'PENDING_ON_DELIVERY'] },
    },
    _sum: { totalEgp: true },
    _count: true,
  });

  return (
    <main className="container-page max-w-3xl space-y-6 py-10 md:py-14">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'حساب شركة' : 'Business account'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'بيانات الشركة' : 'Company profile'}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {isAr
            ? 'يمكنك تعديل بيانات التواصل. السجل التجاري والبطاقة الضريبية يعدّلها فريقنا فقط — تواصل معنا لأي تغيير.'
            : 'You can update contact details. Commercial registry and tax card fields are edited by our team only — contact us for changes.'}
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{company.nameAr}</p>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'حساب شركة معتمَد' : 'Approved business account'}
            </p>
          </div>
          <PricingTierBadge
            code={company.pricingTier.code}
            defaultDiscountPercent={
              company.pricingTier.defaultDiscountPercent?.toString() ?? null
            }
            locale={locale}
          />
        </div>

        <dl className="grid gap-3 md:grid-cols-2">
          <Kv
            label={isAr ? 'السجل التجاري' : 'Commercial registry'}
            value={company.crNumber}
            readOnly
          />
          <Kv
            label={isAr ? 'البطاقة الضريبية' : 'Tax card'}
            value={company.taxCardNumber}
            readOnly
          />
          <Kv
            label={isAr ? 'شروط الدفع' : 'Payment terms'}
            value={termsLabel(company.creditTerms, locale)}
            readOnly
          />
          <Kv
            label={isAr ? 'إجمالي الطلبات' : 'Orders placed'}
            value={String(company._count.orders)}
          />
          <Kv
            label={isAr ? 'إجمالي الإيرادات' : 'Lifetime revenue'}
            value={formatEgp(
              lifetimeRevenue._sum.totalEgp?.toString() ?? '0',
              locale,
            )}
          />
          <Kv
            label={isAr ? 'أسعار مخصّصة' : 'Per-SKU overrides'}
            value={String(company._count.priceOverrides)}
          />
        </dl>
      </section>

      <B2BProfileContactForm
        userId={user.id}
        initial={{
          contactName: user.name,
          phone: user.phone ?? '',
          email: user.email ?? '',
        }}
        locale={locale}
      />

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'إجراءات الحساب' : 'Account actions'}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/b2b/bulk-order"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            {isAr ? 'طلب مُجمَّع (Bulk)' : 'Bulk order'}
          </Link>
          <Link
            href="/b2b/orders"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
          >
            {isAr ? 'طلبات الشركة' : 'Company orders'}
          </Link>
          <Link
            href="/account/orders"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
          >
            {isAr ? 'طلباتي' : 'My orders'}
          </Link>
          <Link
            href="/account/change-password"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
          >
            {isAr ? 'تغيير كلمة المرور' : 'Change password'}
          </Link>
          <Link
            href="/account/addresses"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
          >
            {isAr ? 'العناوين' : 'Addresses'}
          </Link>
          <LogoutButton
            variant="danger"
            label={isAr ? 'تسجيل الخروج' : 'Sign out'}
            pendingLabel={isAr ? 'جارٍ الخروج...' : 'Signing out...'}
          />
        </div>
      </section>
    </main>
  );
}

function Kv({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">
        {label}
        {readOnly ? (
          <span className="ms-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            RO
          </span>
        ) : null}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function termsLabel(
  terms: 'NONE' | 'NET_15' | 'NET_30' | 'CUSTOM',
  locale: 'ar' | 'en',
): string {
  if (locale === 'ar') {
    switch (terms) {
      case 'NONE':
        return 'الدفع على الطلب';
      case 'NET_15':
        return 'أجل سداد 15 يومًا';
      case 'NET_30':
        return 'أجل سداد 30 يومًا';
      case 'CUSTOM':
        return 'شروط متفق عليها';
    }
  }
  switch (terms) {
    case 'NONE':
      return 'Pay on order';
    case 'NET_15':
      return 'Net 15';
    case 'NET_30':
      return 'Net 30';
    case 'CUSTOM':
      return 'Custom terms';
  }
}
