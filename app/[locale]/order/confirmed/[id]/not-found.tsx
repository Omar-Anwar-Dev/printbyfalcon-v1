import { getLocale } from 'next-intl/server';
import { Receipt, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import { getOptionalUser } from '@/lib/auth';
import { getStoreInfo } from '@/lib/settings/store-info';

/**
 * Rendered when /order/confirmed/[id] calls notFound() — either because the
 * order id doesn't exist OR the signed-in user doesn't own it. We deliberately
 * don't distinguish the two cases (privacy: don't leak whether an arbitrary id
 * resolves to a real order). The copy guides the legitimate user to the right
 * place: signed-in B2C users to their orders list, B2B users to the company
 * orders list, and signed-out users to sign in.
 */
export default async function OrderConfirmedNotFound() {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  const store = await getStoreInfo();

  const supportPhone = (store.supportWhatsapp || '').replace(/[^0-9]/g, '');
  const supportMessage = isAr
    ? 'مرحبًا، عندي مشكلة في الوصول لطلب على الموقع.'
    : "Hi, I'm having trouble accessing an order on the site.";
  const supportHref = supportPhone
    ? `https://wa.me/${supportPhone}?text=${encodeURIComponent(supportMessage)}`
    : null;

  const ordersHref = user?.type === 'B2B' ? '/b2b/orders' : '/account/orders';

  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
        <Receipt className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {isAr ? 'طلب غير متاح' : 'Order unavailable'}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {isAr ? 'لم نعثر على هذا الطلب' : "We couldn't find that order"}
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        {user
          ? isAr
            ? 'الطلب اللي تحاول تفتحه مش موجود في حسابك. تأكّد من الرابط أو افتح قائمة طلباتك.'
            : "The order you're trying to open isn't in your account. Double-check the link or open your orders list."
          : isAr
            ? 'يمكن لازم تسجّل الدخول بنفس الرقم اللي طلبت بيه — أو يكون الرابط غير صحيح.'
            : 'You may need to sign in with the same phone you ordered with — or the link could be incorrect.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {user ? (
          <Button asChild variant="accent" size="lg">
            <Link href={ordersHref}>
              {isAr ? 'فتح طلباتي' : 'Open my orders'}
              <ArrowRight
                className="ms-2 h-5 w-5 rtl:rotate-180"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="accent" size="lg">
            <Link href="/sign-in">{isAr ? 'تسجيل الدخول' : 'Sign in'}</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/">{isAr ? 'الصفحة الرئيسية' : 'Go home'}</Link>
        </Button>
      </div>
      {supportHref ? (
        <p className="mt-10 text-sm text-muted-foreground">
          {isAr ? 'تحتاج مساعدة؟' : 'Need help?'}{' '}
          <a
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-strong hover:underline"
          >
            {isAr ? 'راسلنا على واتساب' : 'Message us on WhatsApp'}
          </a>
        </p>
      ) : null}
    </section>
  );
}
