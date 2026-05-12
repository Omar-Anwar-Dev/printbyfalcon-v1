import Script from 'next/script';

/**
 * Sprint 15 — Meta Pixel base code. Initializes `window.fbq` and fires the
 * automatic PageView. Per-event tracking is wired in `lib/tracking/pixel.ts`
 * via the helper components in `components/tracking/`.
 *
 * Renders nothing if `NEXT_PUBLIC_META_PIXEL_ID` is unset, so dev / staging
 * stay silent unless the env var is set there too. Same pattern as
 * `CloudflareAnalytics` (ADR-073).
 *
 * Loaded with `next/script` `strategy="afterInteractive"` — the script runs
 * after page interactivity, NOT during the LCP critical path. fbevents.js
 * is ~70 KB minified + gzipped; loading it earlier would hurt Lighthouse.
 *
 * The PageView fired by the inline init has no `eventID` — Pixel handles
 * it as the canonical PageView for the visit. We do NOT mirror PageView to
 * CAPI server-side; it adds noise without lifting attribution quality.
 * (ViewContent / AddToCart / InitiateCheckout / Purchase all DO get CAPI
 * mirrors via `lib/tracking/pixel.ts` and the relay endpoint.)
 *
 * The <noscript> fallback is the standard 1×1 tracking pixel Meta
 * recommends — fires PageView for the tiny minority of visitors with JS
 * disabled. Keeps Pixel coverage parity with the automatic install.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;
  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        // The init blob is Meta's verbatim install snippet. Do not edit
        // the IIFE body without re-checking against:
        // https://developers.facebook.com/docs/meta-pixel/get-started
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
`.trim(),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
