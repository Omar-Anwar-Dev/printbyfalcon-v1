/**
 * IndexNow API — submit URLs to Bing + Yandex (and any IndexNow-compliant
 * search engine) when content changes. Google does NOT support IndexNow, so
 * this is strictly a Bing/Yandex accelerator; Googlebot still discovers
 * changes via crawl + sitemap signals.
 *
 * Setup steps (one-time, by hand on the VPS):
 *   1. Pick a random 32-char hex key. Set INDEXNOW_KEY=<key> in
 *      .env.production. Pick a different key per environment.
 *   2. Place a file at `public/<key>.txt` containing exactly the key text.
 *      Bing fetches this to verify ownership the first time you submit.
 *   3. (Optional) Set INDEXNOW_HOST=printbyfalcon.com — defaults to the
 *      hostname of APP_URL.
 *
 * Until those are configured, `pingIndexNow` is a no-op that logs once.
 * No external requests fire, no errors throw — safe to call from anywhere.
 *
 * Usage:
 *   await pingIndexNow([
 *     'https://printbyfalcon.com/ar/products/hp-toner-59a',
 *     'https://printbyfalcon.com/en/products/hp-toner-59a',
 *   ]);
 */

const ENDPOINT = 'https://api.indexnow.org/IndexNow';

let warned = false;

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    if (!warned) {
      console.warn(
        '[indexnow] INDEXNOW_KEY not set — skipping submission. ' +
          'See lib/seo/indexnow.ts header for setup steps.',
      );
      warned = true;
    }
    return;
  }

  const appUrl =
    process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';
  const host = process.env.INDEXNOW_HOST?.trim() || new URL(appUrl).hostname;

  // IndexNow accepts up to 10,000 URLs per request. Realistic batches are
  // tiny (one product update = ~2 URLs), so a single request is plenty.
  const body = {
    host,
    key,
    keyLocation: `${appUrl}/${key}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Don't let a slow IndexNow endpoint stall the request that triggered it.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => '');
      console.warn(
        `[indexnow] ${res.status} ${res.statusText} — ${text.slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.warn(
      `[indexnow] submission failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Convenience: build the AR + EN URLs for a public path and ping. */
export async function pingIndexNowBilingual(path: string): Promise<void> {
  const appUrl =
    process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  await pingIndexNow([`${appUrl}/ar${cleanPath}`, `${appUrl}/en${cleanPath}`]);
}
