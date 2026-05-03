import { getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireAdmin } from '@/lib/auth';
import { canAct } from '@/lib/admin/role-matrix';
import { prisma } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FeedbackTriagePanel } from '@/components/admin/feedback-triage-panel';
import { FeedbackCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  if (!canAct(user.adminRole ?? null, 'FEEDBACK')) {
    redirect('/admin/unauthorized');
  }
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const { id } = await params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, type: true } },
    },
  });
  if (!feedback) notFound();

  const reviewer = feedback.reviewedById
    ? await prisma.user.findUnique({
        where: { id: feedback.reviewedById },
        select: { name: true, email: true },
      })
    : null;

  const categoryLabel = (isAr ? CATEGORY_LABELS_AR : CATEGORY_LABELS_EN)[
    feedback.category
  ];

  return (
    <main className="container-page max-w-3xl py-10">
      <AdminPageHeader
        overline={isAr ? 'الإطلاق التجريبي' : 'Closed beta'}
        title={isAr ? 'تفاصيل الملاحظة' : 'Feedback detail'}
        subtitle={
          <Link
            href="/admin/feedback"
            className="text-accent-strong hover:underline"
          >
            {isAr ? '← الرجوع للقائمة' : '← Back to list'}
          </Link>
        }
      />

      <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">
            {isAr ? 'الفئة' : 'Category'}
          </dt>
          <dd className="font-medium">{categoryLabel}</dd>

          <dt className="text-muted-foreground">
            {isAr ? 'الحالة' : 'Status'}
          </dt>
          <dd className="font-medium">{feedback.status}</dd>

          <dt className="text-muted-foreground">
            {isAr ? 'تاريخ' : 'Submitted'}
          </dt>
          <dd>
            {new Date(feedback.createdAt).toLocaleString(
              isAr ? 'ar-EG' : 'en-US',
            )}
          </dd>

          <dt className="text-muted-foreground">{isAr ? 'لغة' : 'Locale'}</dt>
          <dd>{feedback.locale}</dd>

          <dt className="text-muted-foreground">
            {isAr ? 'المُرسل' : 'Submitter'}
          </dt>
          <dd>
            {feedback.user ? (
              <Link
                href={
                  feedback.user.type === 'B2C'
                    ? `/admin/customers/${feedback.user.id}`
                    : `/admin/b2b/companies`
                }
                className="font-medium hover:underline"
              >
                {feedback.user.name}{' '}
                <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                  {feedback.user.type}
                </span>
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {isAr ? 'ضيف' : 'Anonymous guest'}
              </span>
            )}
          </dd>

          {feedback.contactName || feedback.contactValue ? (
            <>
              <dt className="text-muted-foreground">
                {isAr ? 'وسيلة تواصل' : 'Contact'}
              </dt>
              <dd>
                {feedback.contactName ?? '—'}
                {feedback.contactValue ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · {feedback.contactValue}
                  </span>
                ) : null}
              </dd>
            </>
          ) : null}

          {feedback.pathname ? (
            <>
              <dt className="text-muted-foreground">
                {isAr ? 'الصفحة' : 'Page'}
              </dt>
              <dd className="font-mono text-xs">{feedback.pathname}</dd>
            </>
          ) : null}

          {feedback.userAgent ? (
            <>
              <dt className="text-muted-foreground">
                {isAr ? 'المتصفح' : 'User agent'}
              </dt>
              <dd className="break-all font-mono text-xs text-muted-foreground">
                {feedback.userAgent}
              </dd>
            </>
          ) : null}

          {feedback.reviewedAt ? (
            <>
              <dt className="text-muted-foreground">
                {isAr ? 'راجع بواسطة' : 'Reviewed by'}
              </dt>
              <dd>
                {reviewer?.name ?? '—'}{' '}
                <span className="text-muted-foreground">
                  ·{' '}
                  {new Date(feedback.reviewedAt).toLocaleString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}
                </span>
              </dd>
            </>
          ) : null}
        </dl>

        <div className="rounded-md border border-border bg-canvas p-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {feedback.message}
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-border bg-paper p-5">
        <h2 className="text-base font-semibold">
          {isAr ? 'فرز الملاحظة' : 'Triage'}
        </h2>
        <FeedbackTriagePanel
          feedbackId={feedback.id}
          initialStatus={feedback.status}
          initialAdminNote={feedback.adminNote ?? ''}
          isAr={isAr}
        />
      </section>
    </main>
  );
}
