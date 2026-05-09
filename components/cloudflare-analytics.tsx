import Script from 'next/script';

/**
 * Cloudflare Web Analytics beacon.
 *
 * Renders nothing if `CLOUDFLARE_WEB_ANALYTICS_TOKEN` is not set, so dev /
 * staging deploys don't ship the beacon by default. Cookieless + privacy-first
 * (no PII, no cross-site tracking) — does not require cookie-consent opt-in
 * under PDPL Law 151/2020 since aggregated, anonymous traffic data falls
 * outside personal-data scope.
 *
 * Stats (pageviews, unique visitors, avg time on site, top pages, country
 * breakdown) are viewable in the Cloudflare dashboard:
 *   https://dash.cloudflare.com/?to=/:account/web-analytics
 */
export function CloudflareAnalytics() {
  const token = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  if (!token) return null;
  return (
    <Script
      id="cloudflare-web-analytics"
      strategy="afterInteractive"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
