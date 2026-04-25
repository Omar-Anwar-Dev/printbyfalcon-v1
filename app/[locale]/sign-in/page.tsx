import { getLocale } from 'next-intl/server';
import { Building2, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { B2CSignInFlow } from './b2c-sign-in-flow';

/**
 * Sign-in page — Sprint 11 UI refiner v2 Tier 2 polish.
 *
 * Split layout (Raya-inspired): form on the start side, value-prop / B2B
 * bridge panel on the end side (desktop). Stacks on mobile.
 */
export default async function SignInPage() {
  const locale = await getLocale();
  const isAr = locale === 'ar';

  const valueProps = [
    {
      icon: ShieldCheck,
      title: isAr ? 'منتجات أصلية' : 'Genuine products',
      body: isAr
        ? 'حبر وتونر من موزعين رسميين، من غير تقليد.'
        : 'Ink and toner from authorized dealers — no knockoffs.',
    },
    {
      icon: Truck,
      title: isAr ? 'توصيل لكل المحافظات' : 'Nationwide delivery',
      body: isAr
        ? 'شحن لجميع محافظات مصر خلال 1 – 5 أيام عمل.'
        : 'We ship to all 27 Egyptian governorates in 1 – 5 business days.',
    },
    {
      icon: MessageCircle,
      title: isAr ? 'دعم عبر واتساب' : 'WhatsApp support',
      body: isAr
        ? 'أي سؤال — راسلنا مباشرة على واتساب.'
        : 'Any question — message us directly on WhatsApp.',
    },
  ];

  return (
    <main className="container-page py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-card md:grid-cols-[1.1fr_1fr]">
        {/* Form side */}
        <section className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {isAr ? 'أفراد' : 'Individuals'}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAr ? 'أهلًا، سجّل دخولك' : 'Welcome — sign in'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAr
              ? 'استخدم رقم هاتفك، هنرسل لك رمز تحقق على واتساب.'
              : 'Enter your phone — we send a one-time code on WhatsApp.'}
          </p>

          <div className="mt-8">
            <B2CSignInFlow />
          </div>
        </section>

        {/* B2B bridge + value props */}
        <aside className="relative bg-ink p-6 text-canvas sm:p-10">
          {/* Subtle accent blur for depth */}
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
              {isAr ? 'للشركات' : 'For businesses'}
            </div>
            <h2 className="mt-4 text-xl font-bold leading-tight text-canvas sm:text-2xl">
              {isAr
                ? 'شركتك تشتري بالجملة؟'
                : 'Does your company buy in volume?'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-canvas/70">
              {isAr
                ? 'حساب شركة + أسعار تاجر + فواتير ضريبية + شروط دفع متفق عليها.'
                : 'Business account with negotiated pricing, tax invoices, and agreed payment terms.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/b2b/login"
                className="inline-flex h-10 items-center rounded-md bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas/90"
              >
                {isAr ? 'دخول الشركات' : 'Business login'}
              </Link>
              <Link
                href="/b2b/register"
                className="inline-flex h-10 items-center rounded-md border border-canvas/25 px-4 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10"
              >
                {isAr ? 'سجل شركتك' : 'Register a business'}
              </Link>
            </div>

            <div className="mt-10 h-px bg-canvas/10" />

            <ul className="mt-6 space-y-4">
              {valueProps.map((prop) => (
                <li key={prop.title} className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-canvas/10 text-canvas">
                    <prop.icon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-canvas">
                      {prop.title}
                    </p>
                    <p className="mt-0.5 text-xs text-canvas/70">{prop.body}</p>
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
