/**
 * Sprint 11.5 — the 5 originally-seeded shipping zones identified by their
 * stable string codes. Used by the admin UI to:
 *   - Hide the "Delete" button on these zones (only soft-archive allowed)
 *   - Tag them with a "Seed" badge in the zones list
 *   - Block the server-side delete action (defense in depth)
 *
 * Lives in this neutral lib file (NOT a `'use client'` component) so both
 * server pages and client components can import it. Importing constants
 * across the client/server boundary in Next.js 15 silently breaks at build
 * time (the minifier scrambles the reference) — see the original Sprint
 * 11.5 hotfix that moved this out of `components/admin/zones-manager.tsx`.
 */
export const SHIPPING_ZONE_SEED_CODES: ReadonlySet<string> = new Set([
  'GREATER_CAIRO',
  'ALEX_DELTA',
  'CANAL_SUEZ',
  'UPPER_EGYPT',
  'SINAI_RED_SEA_REMOTE',
]);
