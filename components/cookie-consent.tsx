'use client';

/**
 * Cookie consent banner.
 *
 * Sprint 11 S11-D7-T3: introduced as informational-only (essential cookies
 * + Cloudflare Web Analytics, no advertising trackers).
 *
 * Sprint 15 update: site now runs Meta Pixel + Conversions API for paid
 * Meta ads attribution. Banner copy was updated to truthfully disclose
 * this. Tracking is on-by-default; the `/cookies` page documents the
 * browser-level opt-out path. No in-banner opt-out toggle in v1 — owner
 * preference for minimum complexity. Future v1.1 work could add a true
 * opt-in/opt-out toggle if ad performance allows it.
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
    ? 'نستخدم ملفات تعريف الارتباط الضرورية لتشغيل الموقع، بالإضافة إلى أدوات تحليل وإعلانات (Meta Pixel) لقياس فعالية حملاتنا.'
    : 'We use essential cookies to run the site, plus analytics and advertising tools (Meta Pixel) to measure our campaign performance.';
  const more = isAr ? 'المزيد' : 'Learn more';
  const ok = isAr ? 'حسنًا' : 'Got it';

  return (
    <div
      role="region"
      aria-label={isAr ? 'إشعار ملفات تعريف الارتباط' : 'Cookie notice'}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-border bg-background p-4 shadow-card md:inset-x-auto md:bottom-4 md:end-4 md:start-auto"
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
