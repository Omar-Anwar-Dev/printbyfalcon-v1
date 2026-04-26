import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { KeyRound } from 'lucide-react';
import { getOptionalUser } from '@/lib/auth';
import { ChangePasswordForm } from './change-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'تغيير كلمة المرور' : 'Change password',
    robots: { index: false, follow: false },
  };
}

/**
 * Generic post-login change-password page used by:
 *   - B2B users on first login after admin approval (`mustChangePassword`)
 *   - Any signed-in user who wants to rotate their password from the portal
 *
 * Admin users have their own ink-banner variant at `/admin/change-password`;
 * this page handles B2B + B2C with a calmer storefront-style header. The
 * underlying server action (`changePasswordAction`) already supports any
 * signed-in user, so we just need a destination route here.
 */
export default async function AccountChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isAr = locale === 'ar';

  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/sign-in`);
  // Admin gets the ink-banner variant for visual continuity with the admin
  // shell — same destination, different chrome.
  if (user.type === 'ADMIN') redirect(`/${locale}/admin/change-password`);

  // Where to send the user after a successful change. Mirrors the type-based
  // redirects in the rest of the auth flow: B2B → company profile, B2C →
  // account home.
  const redirectAfter =
    user.type === 'B2B' ? `/${locale}/b2b/profile` : `/${locale}/account`;

  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-10 md:py-16">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-background shadow-card">
        <div className="border-b border-border bg-paper px-6 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {isAr ? 'الأمان' : 'Security'}
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {user.mustChangePassword
              ? isAr
                ? 'اختَر كلمة مرور جديدة'
                : 'Choose a new password'
              : isAr
                ? 'تغيير كلمة المرور'
                : 'Change your password'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.mustChangePassword
              ? isAr
                ? 'أول تسجيل دخول بعد قبول حساب الشركة — استبدِل كلمة المرور المؤقتة بكلمة مرور خاصة بك.'
                : "First login after your business account was approved — please replace the temporary password with one you'll remember."
              : isAr
                ? 'أدخل كلمة مرورك الحالية ثم اختر واحدة جديدة.'
                : 'Enter your current password, then choose a new one.'}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <ChangePasswordForm
            locale={isAr ? 'ar' : 'en'}
            redirectTo={redirectAfter}
          />
        </div>
      </div>
    </main>
  );
}
