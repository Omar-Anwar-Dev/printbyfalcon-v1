import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { governorateLabel } from '@/lib/i18n/governorates';
import { B2BApplicationDecision } from '@/components/admin/b2b-application-decision';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminB2BApplicationsPage({
  params,
  searchParams,
}: Props) {
  await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isAr = locale === 'ar';

  const statusFilter =
    sp.status === 'APPROVED'
      ? 'APPROVED'
      : sp.status === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING';

  const applications = await prisma.b2BApplication.findMany({
    where: { status: statusFilter },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      companyName: true,
      crNumber: true,
      taxCardNumber: true,
      contactName: true,
      phone: true,
      email: true,
      governorate: true,
      city: true,
      addressLine: true,
      monthlyVolumeEstimate: true,
      createdAt: true,
      status: true,
      decisionNote: true,
      reviewedAt: true,
      resultingCompanyId: true,
    },
    take: 100,
  });

  const pendingCount = await prisma.b2BApplication.count({
    where: { status: 'PENDING' },
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAr ? 'طلبات الشركات' : 'B2B applications'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'راجع طلبات فتح حسابات الشركات. حدّد مستوى الأسعار وشروط الدفع عند الموافقة.'
              : 'Review business account applications. Pick the pricing tier and payment terms at approval.'}
          </p>
        </div>
        <Link
          href="/admin/b2b/companies"
          className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'حسابات الشركات' : 'Companies'}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b pb-3">
        <FilterChip
          href={`/admin/b2b/applications?status=PENDING`}
          active={statusFilter === 'PENDING'}
          label={
            isAr
              ? `قيد المراجعة (${pendingCount})`
              : `Pending (${pendingCount})`
          }
        />
        <FilterChip
          href={`/admin/b2b/applications?status=APPROVED`}
          active={statusFilter === 'APPROVED'}
          label={isAr ? 'معتمَدة' : 'Approved'}
        />
        <FilterChip
          href={`/admin/b2b/applications?status=REJECTED`}
          active={statusFilter === 'REJECTED'}
          label={isAr ? 'مرفوضة' : 'Rejected'}
        />
      </div>

      {applications.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {statusFilter === 'PENDING'
            ? isAr
              ? 'لا توجد طلبات قيد المراجعة.'
              : 'No pending applications.'
            : isAr
              ? 'لا توجد سجلات في هذه الحالة.'
              : 'No records in this bucket yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <article
              key={app.id}
              className="rounded-md border bg-background p-4"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{app.companyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAr
                      ? `تقدّم بواسطة ${app.contactName}`
                      : `Submitted by ${app.contactName}`}
                  </p>
                </div>
                <p
                  className="text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(app.createdAt).toLocaleString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}
                </p>
              </div>

              <dl className="mb-3 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                <Kv
                  label={isAr ? 'البريد' : 'Email'}
                  value={app.email}
                  dir="ltr"
                />
                <Kv
                  label={isAr ? 'الموبايل' : 'Phone'}
                  value={app.phone}
                  dir="ltr"
                />
                <Kv label={isAr ? 'س.ت' : 'CR #'} value={app.crNumber} />
                <Kv label={isAr ? 'ب.ض' : 'Tax #'} value={app.taxCardNumber} />
                <Kv
                  label={isAr ? 'المحافظة' : 'Governorate'}
                  value={`${governorateLabel(app.governorate, locale)} — ${app.city}`}
                />
                <Kv
                  label={isAr ? 'متوسط الإنفاق الشهري' : 'Est. monthly volume'}
                  value={app.monthlyVolumeEstimate ?? '—'}
                />
                {app.addressLine ? (
                  <div className="md:col-span-2 lg:col-span-3">
                    <Kv
                      label={isAr ? 'العنوان' : 'Address'}
                      value={app.addressLine}
                    />
                  </div>
                ) : null}
                {app.decisionNote ? (
                  <div className="md:col-span-2 lg:col-span-3">
                    <Kv
                      label={
                        app.status === 'APPROVED'
                          ? isAr
                            ? 'ملاحظة الموافقة'
                            : 'Approval note'
                          : isAr
                            ? 'سبب الرفض'
                            : 'Rejection reason'
                      }
                      value={app.decisionNote}
                    />
                  </div>
                ) : null}
              </dl>

              {app.status === 'PENDING' ? (
                <B2BApplicationDecision
                  applicationId={app.id}
                  labels={buildLabels(locale)}
                />
              ) : app.status === 'APPROVED' && app.resultingCompanyId ? (
                <Link
                  href={`/admin/b2b/companies/${app.resultingCompanyId}`}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {isAr ? 'فتح ملف الشركة →' : 'View company record →'}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
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
      <dd className={dir === 'ltr' ? 'font-mono text-sm' : 'text-sm'} dir={dir}>
        {value}
      </dd>
    </div>
  );
}

function FilterChip({
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

function buildLabels(locale: 'ar' | 'en') {
  if (locale === 'ar') {
    return {
      approve: 'موافقة',
      reject: 'رفض',
      approveTitle: 'اعتماد طلب الشركة',
      rejectTitle: 'رفض طلب الشركة',
      tier: 'مستوى الأسعار',
      tierAOption: 'المستوى أ — خصم 10٪',
      tierBOption: 'المستوى ب — خصم 15٪',
      tierCOption: 'المستوى ج — أسعار مخصّصة لكل منتج',
      creditTerms: 'شروط الدفع',
      creditTermsNone: 'الدفع على الطلب — بدون أجل',
      creditTermsNet15: 'أجل سداد 15 يومًا',
      creditTermsNet30: 'أجل سداد 30 يومًا',
      creditTermsCustom: 'شروط خاصة',
      creditLimit: 'الحد الائتماني (ج.م)',
      creditLimitHelp: 'الحد الأقصى للرصيد المسموح به على المكشوف.',
      note: 'ملاحظة (اختيارية) — ستظهر في بريد الترحيب',
      notePlaceholder: 'مثال: تم الاتفاق على بداية الشهر كموعد إصدار الفواتير.',
      reason: 'سبب الرفض — سيتم إرساله للعميل',
      reasonPlaceholder:
        'مثال: صورة البطاقة الضريبية غير واضحة؛ يرجى إعادة تقديم طلب بصورة أوضح.',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
      confirmingApprove: 'جارٍ الاعتماد...',
      confirmingReject: 'جارٍ الرفض...',
    };
  }
  return {
    approve: 'Approve',
    reject: 'Reject',
    approveTitle: 'Approve business account',
    rejectTitle: 'Reject business account',
    tier: 'Pricing tier',
    tierAOption: 'Tier A — 10% off list price',
    tierBOption: 'Tier B — 15% off list price',
    tierCOption: 'Tier C — per-product negotiated pricing',
    creditTerms: 'Payment terms',
    creditTermsNone: 'Pay on order — no credit',
    creditTermsNet15: 'Net 15',
    creditTermsNet30: 'Net 30',
    creditTermsCustom: 'Custom terms',
    creditLimit: 'Credit limit (EGP)',
    creditLimitHelp: 'Maximum unpaid balance allowed.',
    note: 'Note (optional) — included in the welcome email',
    notePlaceholder: 'e.g. Monthly invoicing cycle agreed with sales.',
    reason: 'Rejection reason — sent to the applicant',
    reasonPlaceholder:
      'e.g. Tax card image is blurry; please resubmit with a clearer copy.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    confirmingApprove: 'Approving...',
    confirmingReject: 'Rejecting...',
  };
}
