import { requireAdmin } from '@/lib/auth';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { getAllPaymentMethods, getPaymentMode } from '@/lib/settings/payment';
import { PaymentMethodsManager } from '@/components/admin/payment-methods-manager';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [methods, mode] = await Promise.all([
    getAllPaymentMethods(),
    getPaymentMode(),
  ]);

  // Configured-in-env detection — surface a warning if a method is enabled
  // but its corresponding env var pair is missing for the current mode.
  // Mode-aware: in TEST we expect `<NAME>_TEST`, falling back to LIVE.
  function envMissing(method: { paymobIntegrationKind: string | null }) {
    if (!method.paymobIntegrationKind) return false; // COD has no env
    const suffix = method.paymobIntegrationKind.toUpperCase();
    const liveKey = `PAYMOB_INTEGRATION_ID_${suffix}`;
    const testKey = `${liveKey}_TEST`;
    if (mode === 'TEST') {
      return !process.env[testKey] && !process.env[liveKey];
    }
    return !process.env[liveKey];
  }
  const methodViews = methods.map((m) => ({
    ...m,
    envMissing: envMissing(m),
  }));

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? 'طرق الدفع' : 'Payment methods'}
        subtitle={
          isAr
            ? 'فعّل أو عطّل طرق الدفع المعروضة عند إتمام الطلب، وبدّل بين وضع التشغيل التجريبي ووضع الدفع الحقيقي. أي تغيير يستلزم تأكيد كلمة المرور.'
            : 'Toggle payment methods shown at checkout, and switch between test mode and live mode. Sensitive changes require admin password confirmation.'
        }
      />
      <PaymentMethodsManager
        locale={isAr ? 'ar' : 'en'}
        methods={methodViews}
        mode={mode}
      />
    </div>
  );
}
