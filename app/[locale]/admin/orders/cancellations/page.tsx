import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import { CancellationDecisionButtons } from '@/components/admin/cancellation-decision-buttons';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';

export const dynamic = 'force-dynamic';

export default async function CancellationsQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const isAr = locale === 'ar';
  const statusLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const statusLabel = (s: OrderStatusKey) =>
    ORDER_STATUS_LABELS[s][statusLocale];

  const pending = await prisma.order.findMany({
    where: {
      cancellationRequestedAt: { not: null },
      cancellationResolvedAt: null,
    },
    orderBy: { cancellationRequestedAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      contactName: true,
      contactPhone: true,
      status: true,
      totalEgp: true,
      cancellationRequestedAt: true,
      cancellationReason: true,
      createdAt: true,
    },
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAr ? 'طلبات الإلغاء' : 'Cancellation queue'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'الطلبات التي طلب العملاء إلغاءها وبانتظار قرار الإدارة.'
              : 'Customer cancellation requests awaiting an admin decision.'}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'كل الطلبات' : 'All orders'}
        </Link>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {isAr
            ? 'لا توجد طلبات إلغاء معلقة.'
            : 'No pending cancellation requests.'}
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((o) => (
            <article key={o.id} className="rounded-md border bg-background p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="text-sm">{o.contactName}</p>
                  <p
                    className="font-mono text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {o.contactPhone}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-mono text-sm">
                    {formatEgp(o.totalEgp.toString(), isAr ? 'ar' : 'en')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(o.status as OrderStatusKey)}
                  </p>
                </div>
              </div>
              <dl className="mb-3 grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {isAr ? 'تم الطلب' : 'Requested'}
                  </dt>
                  <dd>
                    {o.cancellationRequestedAt
                      ? new Date(o.cancellationRequestedAt).toLocaleString(
                          isAr ? 'ar-EG' : 'en-US',
                        )
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {isAr ? 'سبب العميل' : "Customer's reason"}
                  </dt>
                  <dd className="whitespace-pre-line">
                    {o.cancellationReason ?? (
                      <span className="italic text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              </dl>
              <CancellationDecisionButtons
                orderId={o.id}
                labels={{
                  approve: isAr
                    ? 'موافقة + إلغاء الطلب'
                    : 'Approve + cancel order',
                  deny: isAr ? 'رفض' : 'Deny',
                  approveTitle: isAr
                    ? 'تأكيد إلغاء الطلب'
                    : 'Confirm order cancellation',
                  denyTitle: isAr
                    ? 'رفض طلب الإلغاء'
                    : 'Deny cancellation request',
                  body: isAr
                    ? 'سيتم إخبار العميل بالقرار مع نص الملاحظة إن وُجد.'
                    : 'The customer will be notified of the decision along with any note provided.',
                  note: isAr ? 'ملاحظة (اختيارية)' : 'Note (optional)',
                  notePlaceholder: isAr
                    ? 'مثال: الطلب خرج بالفعل للشحن'
                    : 'e.g. order already handed to courier',
                  confirm: isAr ? 'تنفيذ' : 'Confirm',
                  cancel: isAr ? 'إلغاء' : 'Cancel',
                }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
