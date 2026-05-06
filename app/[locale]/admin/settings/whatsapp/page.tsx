import { requireAdmin } from '@/lib/auth';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { getWhatsappMode } from '@/lib/settings/whatsapp';
import { WhatsappManager } from '@/components/admin/whatsapp-manager';

export const dynamic = 'force-dynamic';

export default async function WhatsappSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const mode = await getWhatsappMode();

  // Surface env-key presence so the owner can spot a misconfiguration before
  // sending a test. Booleans only — actual values never reach the client.
  const envState = {
    tokenSet: Boolean(process.env.WHATS360_TOKEN),
    instanceSet: Boolean(process.env.WHATS360_INSTANCE_ID),
    webhookSecretSet: Boolean(process.env.WHATS360_WEBHOOK_SECRET),
    devModeEnv: process.env.NOTIFICATIONS_DEV_MODE === 'true',
    sandboxEnv: process.env.WHATS360_SANDBOX === 'true',
  };

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? 'الواتساب (Whats360)' : 'WhatsApp (Whats360)'}
        subtitle={
          isAr
            ? 'تحكّم في وضع الإرسال (حقيقي / تجريبي / مُعطَّل) واختبر الاتصال بالجهاز. المفاتيح والـ token تبقى في ملفات env — راجع docs/whats360-key-rotation.md للتغيير.'
            : 'Control transport mode (live / dev / sandbox) and test the device connection. Keys + token stay in env files — see docs/whats360-key-rotation.md to rotate.'
        }
      />
      <WhatsappManager
        locale={isAr ? 'ar' : 'en'}
        mode={mode}
        envState={envState}
      />
    </div>
  );
}
