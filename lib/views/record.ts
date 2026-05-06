/**
 * Storefront view recording (PR 4).
 *
 * Called from `/products/[slug]` and `/categories/[slug]` page components
 * as fire-and-forget side effects of the SSR render. Each call inserts a
 * single append-only row into ProductView / CategoryView; the nightly
 * popularity recompute (`lib/catalog/popularity.ts`) aggregates the
 * trailing 90-day window into the score.
 *
 * Failures are swallowed — a flaky DB insert must never tank the page
 * render the user is here for. Bot/crawler traffic is filtered upstream
 * via the UA heuristic in `bot-filter.ts`.
 */
import 'server-only';
import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { isLikelyBot } from './bot-filter';

const SESSION_COOKIE = 'pbf_session';
const CART_COOKIE = 'pbf_cart';

async function getSessionKey(): Promise<string | null> {
  // Prefer the auth-session cookie (signed-in B2C/B2B/admin). Fall back to
  // the guest-cart cookie set on first cart interaction. Visitors who have
  // neither (fresh anonymous browser) get a NULL sessionKey — still counted
  // for raw popularity, just not deduped per-session.
  const cookieStore = await cookies();
  return (
    cookieStore.get(SESSION_COOKIE)?.value ??
    cookieStore.get(CART_COOKIE)?.value ??
    null
  );
}

export async function recordProductView(productId: string): Promise<void> {
  try {
    const h = await headers();
    if (isLikelyBot(h.get('user-agent'))) return;
    const sessionKey = await getSessionKey();
    await prisma.productView.create({
      data: { productId, sessionKey },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[recordProductView] swallowed:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function recordCategoryView(categoryId: string): Promise<void> {
  try {
    const h = await headers();
    if (isLikelyBot(h.get('user-agent'))) return;
    const sessionKey = await getSessionKey();
    await prisma.categoryView.create({
      data: { categoryId, sessionKey },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[recordCategoryView] swallowed:',
      err instanceof Error ? err.message : err,
    );
  }
}
