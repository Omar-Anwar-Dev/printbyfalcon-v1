import { getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { requireAdmin } from '@/lib/auth';
import { canAct } from '@/lib/admin/role-matrix';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FeedbackCategory, FeedbackStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const STATUS_TONES: Record<FeedbackStatus, string> = {
  NEW: 'border-accent/30 bg-accent-soft text-accent-strong',
  REVIEWING: 'border-warning/30 bg-warning-soft text-warning',
  ACTIONED: 'border-success/30 bg-success-soft text-success',
  DISMISSED: 'border-border bg-paper text-muted-foreground',
};

const CATEGORY_LABELS_AR: Record<FeedbackCategory, string> = {
  BUG: 'مشكلة فنية',
  UX: 'صعوبة استخدام',
  FEATURE_REQUEST: 'اقتراح ميزة',
  PRAISE: 'إعجاب',
  OTHER: 'أخرى',
};

const CATEGORY_LABELS_EN: Record<FeedbackCategory, string> = {
  BUG: 'Bug',
  UX: 'UX',
  FEATURE_REQUEST: 'Feature request',
  PRAISE: 'Praise',
  OTHER: 'Other',
};

const STATUS_LABELS_AR: Record<FeedbackStatus, string> = {
  NEW: 'جديدة',
  REVIEWING: 'قيد المراجعة',
  ACTIONED: 'تم التنفيذ',
  DISMISSED: 'مرفوضة',
};

const STATUS_LABELS_EN: Record<FeedbackStatus, string> = {
  NEW: 'New',
  REVIEWING: 'Reviewing',
  ACTIONED: 'Actioned',
  DISMISSED: 'Dismissed',
};

export default async function AdminFeedbackListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; page?: string }>;
}) {
  const user = await requireAdmin();
  if (!canAct(user.adminRole ?? null, 'FEEDBACK')) {
    redirect('/admin/unauthorized');
  }
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const params = await searchParams;

  const status = (params.status as FeedbackStatus | undefined) ?? null;
  const category = (params.category as FeedbackCategory | undefined) ?? null;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
  };

  const [items, totalCount, statusCounts] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        category: true,
        status: true,
        message: true,
        contactName: true,
        contactValue: true,
        createdAt: true,
        userType: true,
        pathname: true,
      },
    }),
    prisma.feedback.count({ where }),
    prisma.feedback.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const newCount =
    statusCounts.find((c) => c.status === FeedbackStatus.NEW)?._count._all ?? 0;

  const categoryLabels = isAr ? CATEGORY_LABELS_AR : CATEGORY_LABELS_EN;
  const statusLabels = isAr ? STATUS_LABELS_AR : STATUS_LABELS_EN;

  function buildHref(next: {
    status?: string;
    category?: string;
    page?: string;
  }) {
    const sp = new URLSearchParams();
    if (next.status) sp.set('status', next.status);
    if (next.category) sp.set('category', next.category);
    if (next.page && next.page !== '1') sp.set('page', next.page);
    return sp.toString().length > 0
      ? `/admin/feedback?${sp.toString()}`
      : '/admin/feedback';
  }

  return (
    <main className="container-page py-10">
      <AdminPageHeader
        overline={isAr ? 'الإطلاق التجريبي' : 'Closed beta'}
        title={isAr ? 'ملاحظات المختبرين' : 'Tester feedback'}
        subtitle={
          newCount > 0
            ? isAr
              ? `${newCount} ملاحظة جديدة بانتظار المراجعة`
              : `${newCount} new awaiting review`
            : isAr
              ? 'لا توجد ملاحظات جديدة الآن.'
              : 'No new feedback right now.'
        }
      />

      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-xs"
        aria-label={isAr ? 'عوامل التصفية' : 'Filters'}
      >
        <Link
          href={buildHref({ category: category ?? undefined })}
          className={`rounded-full border px-2.5 py-1 ${
            !status
              ? 'border-foreground bg-foreground text-canvas'
              : 'border-border bg-paper hover:border-accent/30'
          }`}
        >
          {isAr ? 'الكل' : 'All'}
        </Link>
        {(Object.keys(STATUS_LABELS_EN) as FeedbackStatus[]).map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, category: category ?? undefined })}
            className={`rounded-full border px-2.5 py-1 ${
              status === s
                ? 'border-foreground bg-foreground text-canvas'
                : 'border-border bg-paper hover:border-accent/30'
            }`}
          >
            {statusLabels[s]}
          </Link>
        ))}
        <span className="mx-1 text-muted-foreground" aria-hidden>
          ·
        </span>
        <Link
          href={buildHref({ status: status ?? undefined })}
          className={`rounded-full border px-2.5 py-1 ${
            !category
              ? 'border-foreground bg-foreground text-canvas'
              : 'border-border bg-paper hover:border-accent/30'
          }`}
        >
          {isAr ? 'كل الفئات' : 'All categories'}
        </Link>
        {(Object.keys(CATEGORY_LABELS_EN) as FeedbackCategory[]).map((c) => (
          <Link
            key={c}
            href={buildHref({ category: c, status: status ?? undefined })}
            className={`rounded-full border px-2.5 py-1 ${
              category === c
                ? 'border-foreground bg-foreground text-canvas'
                : 'border-border bg-paper hover:border-accent/30'
            }`}
          >
            {categoryLabels[c]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-paper p-6 text-center text-sm text-muted-foreground">
          {isAr
            ? 'لا توجد ملاحظات بهذه العوامل.'
            : 'No feedback matches these filters.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-paper p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`rounded-full border px-2 py-0.5 font-semibold ${STATUS_TONES[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
                <span className="rounded-full border border-border bg-canvas px-2 py-0.5">
                  {categoryLabels[item.category]}
                </span>
                {item.userType ? (
                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                    {item.userType}
                  </span>
                ) : (
                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {isAr ? 'ضيف' : 'Guest'}
                  </span>
                )}
                <span>·</span>
                <time>
                  {new Date(item.createdAt).toLocaleString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}
                </time>
                {item.pathname ? (
                  <>
                    <span>·</span>
                    <span className="truncate font-mono text-[11px]">
                      {item.pathname}
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-foreground">
                {item.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {item.contactName || item.contactValue
                    ? `${item.contactName ?? ''} ${
                        item.contactValue ? `· ${item.contactValue}` : ''
                      }`
                    : isAr
                      ? 'لم يترك وسيلة تواصل'
                      : 'No contact provided'}
                </span>
                <Link
                  href={`/admin/feedback/${item.id}`}
                  className="rounded-md border border-border px-3 py-1 font-medium hover:border-accent/40"
                >
                  {isAr ? 'فتح' : 'Open'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={buildHref({
                status: status ?? undefined,
                category: category ?? undefined,
                page: String(page - 1),
              })}
              className="rounded-md border px-3 py-1.5 hover:border-accent/40"
            >
              {isAr ? 'السابق' : 'Previous'}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {isAr
              ? `صفحة ${page} من ${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({
                status: status ?? undefined,
                category: category ?? undefined,
                page: String(page + 1),
              })}
              className="rounded-md border px-3 py-1.5 hover:border-accent/40"
            >
              {isAr ? 'التالي' : 'Next'}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
