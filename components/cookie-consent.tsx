'use client';

/**
 * Cookie consent banner (Sprint 11 S11-D7-T3).
 *
 * At MVP the site uses only essential cookies — pbf_session, NEXT_LOCALE,
 * pbf_cart_sid — so there's no opt-in/opt-out choice to make. This banner is
 * informational and linkable: shows once per user, dismissed by clicking
 * "Got it", persisted in localStorage so it doesn't re-appear.
 *
 * When we eventually add analytics / marketing trackers (v1.1), this banner
 * becomes the anchor point for the opt-in toggle.
 */
import { useEffect, useState } from 'react';

const CONSENT_KEY = 'pbf_cookie_consent';

type Props = {
  locale: 'ar' | 'en';
};

export function CookieConsent({ locale }: Props) {
  const [visible, setVisible] = useState(false);
  const isAr = locale === 'ar';

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CONSENT_KEY) !== 'dismissed') {
        // Defer showing the banner by one frame so it animates in after
        // initial page content paints.
        const id = window.setTimeout(() => setVisible(true), 400);
        return () => window.clearTimeout(id);
      }
    } catch {
      // localStorage unavailable (private mode, SSR quirk) — show the banner
      // conservatively.
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(CONSENT_KEY, 'dismissed');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  const message = isAr
    ? 'نستخدم ملفات تعريف الارتباط الضرورية فقط (جلسة الدخول، اللغة، السلة) لتشغيل الموقع. لا تتبّع إعلاني.'
    : 'We use essential cookies only (session, language, cart) to run the site. No advertising trackers.';
  const more = isAr ? 'المزيد' : 'Learn more';
  const ok = isAr ? 'حسنًا' : 'Got it';

  return (
    <div
      role="region"
      aria-label={isAr ? 'إشعار ملفات تعريف الارتباط' : 'Cookie notice'}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-border bg-background p-4 shadow-popover md:inset-x-auto md:bottom-4 md:end-4 md:start-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          {message}{' '}
          <a
            href={`/${locale}/cookies`}
            className="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
          >
            {more}
          </a>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-ink-2"
        >
          {ok}
        </button>
      </div>
    </div>
  );
}
