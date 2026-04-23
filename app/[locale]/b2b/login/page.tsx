import { getLocale, getTranslations } from 'next-intl/server';
import { Building2, ShieldCheck, FileText, Truck } from 'lucide-react';
import { B2BLoginForm } from '@/app/[locale]/login/b2b-login-form';
import { Link } from '@/lib/i18n/routing';

export default async function B2BLoginPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';

  const benefits = [
    {
      icon: ShieldCheck,
      title: isAr ? 'أسعار مخصّصة' : 'Negotiated pricing',
      body: isAr
        ? 'خصومات معتمدة للشركات على الكتالوج كله.'
        : 'Tiered discounts applied across the entire catalog.',
    },
    {
      icon: FileText,
      title: isAr ? 'فواتير ضريبية' : 'VAT-compliant invoices',
      body: isAr
        ? 'فواتير رسمية تتضمن بيانات شركتك وضريبة القيمة المضافة.'
        : 'Tax invoices with your CR # + tax card and VAT breakdown.',
    },
    {
      icon: Truck,
      title: isAr ? 'طلبات كمية' : 'Bulk ordering',
      body: isAr
        ? 'أداة طلب جماعية بأكواد SKU + إعادة طلب بضغطة واحدة.'
        : 'Bulk-order tool + one-click reorder from any past invoice.',
    },
  ];

  return (
    <main className="container-page py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-card md:grid-cols-[1.1fr_1fr]">
        <section className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {isAr ? 'شركات' : 'Business'}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('auth.b2bTitle')}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAr
              ? 'بريد الشركة + كلمة المرور — نفس الحساب اللي وافقنا عليه.'
              : 'Company email + password — the account your rep approved.'}
          </p>
          <div className="mt-8">
            <B2BLoginForm />
          </div>
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
            <Link
              href="/b2b/forgot-password"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
            <Link
              href="/b2b/register"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('b2b.login.noAccountYet')}
            </Link>
            <Link
              href="/sign-in"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t('auth.b2cTitle')}
            </Link>
          </div>
        </section>

        <aside className="relative bg-ink p-6 text-canvas sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/30 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-canvas/20 bg-canvas/5 px-3 py-1 text-xs font-medium text-canvas/90">
              <Building2
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                aria-hidden
              />
              {isAr ? 'مزايا حساب الشركات' : 'Business account perks'}
            </div>
            <h2 className="mt-4 text-xl font-bold leading-tight text-canvas sm:text-2xl">
              {isAr
                ? 'كل ما تحتاجه شركتك من طابعات ومستلزمات'
                : 'Everything your company needs — printers + supplies'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-canvas/70">
              {isAr
                ? 'لو لسه ما عندكش حساب، ابدأ التسجيل واحنا هنراجع خلال 24 ساعة.'
                : "Don't have an account yet? Apply and we'll review within 24 hours."}
            </p>
            <Link
              href="/b2b/register"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas/90"
            >
              {isAr ? 'سجّل شركتك الآن' : 'Register your business'}
            </Link>

            <div className="mt-10 h-px bg-canvas/10" />

            <ul className="mt-6 space-y-4">
              {benefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-canvas/10 text-canvas">
                    <b.icon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-canvas">{b.title}</p>
                    <p className="mt-0.5 text-xs text-canvas/70">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
