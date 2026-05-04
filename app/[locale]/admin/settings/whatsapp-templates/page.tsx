import { getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import type { WhatsappTemplateCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS_AR: Record<WhatsappTemplateCategory, string> = {
  ORDER: 'الطلبات',
  B2B: 'حسابات الشركات',
  PROMO: 'العروض',
  SUPPORT: 'الدعم',
  RETURN: 'الإرجاع',
};
const CATEGORY_LABELS_EN: Record<WhatsappTemplateCategory, string> = {
  ORDER: 'Orders',
  B2B: 'Business (B2B)',
  PROMO: 'Promotions',
  SUPPORT: 'Support',
  RETURN: 'Returns',
};

export default async function AdminWhatsappTemplatesIndex() {
  await requireAdmin(['OWNER']);
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';

  const templates = await prisma.whatsappTemplate.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const categoryLabels = isAr ? CATEGORY_LABELS_AR : CATEGORY_LABELS_EN;
  const grouped: Record<string, typeof templates> = {};
  for (const t of templates) {
    const cat = t.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? 'قوالب رسائل واتساب' : 'WhatsApp message templates'}
        subtitle={
          isAr
            ? 'عدّل صياغة الرسائل التي تُرسل تلقائيًا للعملاء — تأكيد الطلبات، التسليم للشحن، الإلغاء، وغيرها. لا تشمل رسائل OTP (محمية لحماية تسجيل الدخول).'
            : 'Edit the wording of automated customer messages — order confirmations, courier hand-off, cancellation, and more. OTP messages are excluded (auth-critical).'
        }
      />

      <div className="space-y-8">
        {(Object.keys(grouped) as WhatsappTemplateCategory[]).map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2
              id={`cat-${cat}`}
              className="mb-3 border-b border-border pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              {categoryLabels[cat]}
            </h2>
            <ul className="space-y-3">
              {grouped[cat].map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/settings/whatsapp-templates/${t.id}`}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-paper p-5 transition-colors hover:border-accent/40 hover:bg-paper-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {isAr ? t.nameAr : t.nameEn}
                        </span>
                        <span className="rounded-full border border-border bg-canvas px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {t.key}
                        </span>
                        {t.isActive ? (
                          <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                            {isAr ? 'مفعّل' : 'Active'}
                          </span>
                        ) : (
                          <span className="rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                            {isAr ? 'معطّل' : 'Inactive'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {isAr ? t.descriptionAr : t.descriptionEn}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {isAr ? 'آخر تعديل:' : 'Last updated:'}{' '}
                        {new Date(t.updatedAt).toLocaleString(
                          isAr ? 'ar-EG' : 'en-US',
                        )}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="mt-1 shrink-0 text-muted-foreground"
                    >
                      ←
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-md border border-accent/20 bg-accent-soft p-4 text-sm text-accent-strong">
        <strong>{isAr ? 'ملاحظة:' : 'Note:'}</strong>{' '}
        {isAr
          ? 'رسائل OTP (تسجيل الدخول) غير قابلة للتعديل لأسباب أمنية — تظل مكتوبة في الكود لضمان عدم تعطيل تسجيل الدخول بالخطأ.'
          : 'OTP (sign-in) messages are not editable for security — they stay code-defined to prevent accidental auth breakage.'}
      </p>
    </main>
  );
}
