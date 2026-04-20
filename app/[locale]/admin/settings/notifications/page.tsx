import { requireAdmin } from '@/lib/auth';
import { getNotificationOptOut } from '@/lib/settings/notifications';
import { NotificationOptOutForm } from '@/components/admin/notification-optout-form';
import { ORDER_STATUS_LABELS } from '@/lib/whatsapp-templates';
import type { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';
  const statusLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';

  const initial = await getNotificationOptOut();

  const statusLabels = Object.fromEntries(
    (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => [
      s,
      ORDER_STATUS_LABELS[s][statusLocale],
    ]),
  ) as Record<OrderStatus, string>;

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'إعدادات الإشعارات' : 'Notification settings'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'تحكم في أي حالات تُرسل فيها إشعارات للعملاء عبر كل قناة. الحالات المعلَّمة هنا تُتجاهل تماماً — لا يتم إنشاء سجل إشعار أو إرسال رسالة.'
          : 'Control which status transitions notify customers on each channel. Ticked statuses are skipped entirely — no Notification row created and no message sent.'}
      </p>
      <NotificationOptOutForm
        initial={initial}
        labels={{
          intro: isAr
            ? 'علّم الحالات التي تريد إلغاء الإشعارات عنها (افتراضياً لا شيء مُعطَّل).'
            : 'Check statuses where you want to suppress notifications (nothing suppressed by default).',
          whatsappHeader: isAr
            ? 'واتساب — كل الطلبات'
            : 'WhatsApp — all orders',
          emailHeader: isAr
            ? 'البريد — الطلبات B2B فقط'
            : 'Email — B2B orders only',
          statusLabels,
          save: isAr ? 'حفظ الإعدادات' : 'Save settings',
          saved: isAr ? 'تم الحفظ' : 'Saved',
        }}
      />
    </div>
  );
}
