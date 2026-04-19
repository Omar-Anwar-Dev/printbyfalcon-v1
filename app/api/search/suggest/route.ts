import { NextResponse } from 'next/server';
import { searchProductSuggestions } from '@/lib/catalog/search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Header autocomplete — returns up to 5 active products matching `q`.
 * Bilingual payload: client picks `nameAr` or `nameEn` based on active locale.
 * Empty/missing `q` → `{ suggestions: [] }` with no DB round-trip.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const suggestions = await searchProductSuggestions(q, 5);
  return NextResponse.json(
    { suggestions },
    {
      headers: {
        // Prevent Cloudflare / browser caching of personalized-ish lookups.
        'Cache-Control': 'no-store',
      },
    },
  );
}
