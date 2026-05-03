/**
 * Payments feature flags. Read once on the server (not a runtime DB setting).
 *
 * Per ADR-064 (Sprint 12 / M1 launch posture):
 *   M1 launches COD-only because Paymob merchant approval is still in review.
 *   When approval lands, the owner sets `PAYMENTS_PAYMOB_ENABLED=true` in
 *   `.env.production` and redeploys — no code change needed to flip the
 *   gateway on.
 *
 * Default behavior is `true` so:
 *   - Existing staging (which exercises Paymob sandbox) keeps working without
 *     an env-file edit.
 *   - Local dev keeps the dev-stub Paymob flow active.
 *   - Production is opt-out: owner explicitly sets `=false` for COD-only.
 */
export function isPaymobEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PAYMENTS_PAYMOB_ENABLED !== 'false';
}
