/**
 * Sprint 15 — WhatsApp template renderer.
 *
 * Reads the active `WhatsappTemplate` row from the DB (cached per request via
 * React's `cache()`), substitutes `{{variableName}}` placeholders, and returns
 * the final message body ready for `lib/whatsapp.ts::sendWhatsApp`.
 *
 * **Substitution rules:**
 * - `{{name}}` is replaced by the matching string in the variables map.
 * - Unknown placeholders are left literal (so the admin spots a typo in the
 *   template body without breaking the send).
 * - After substitution, runs of 3+ consecutive newlines are collapsed to 2 —
 *   this lets templates include optional lines like `{{poReferenceLine}}`
 *   that callers pass `''` for when not applicable, without leaving ugly
 *   blank gaps.
 *
 * **Fallback behavior:**
 * - If template missing OR `isActive: false` → returns `null`. Caller is
 *   expected to fall back to the hardcoded function in
 *   `lib/whatsapp-templates.ts` so an accidentally-deleted DB row doesn't
 *   break the notification pipeline.
 *
 * **Out of scope (auth-critical):**
 * - OTP rendering. Stays in `renderOtp()` (hardcoded). Owner cannot edit OTP
 *   wording from admin (per ADR-067).
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { SupportedLocale } from '@/lib/whatsapp-templates';

export type TemplateVariables = Record<string, string | number>;

/**
 * Substitute {{var}} placeholders. Pure function — no DB access.
 * Unknown vars are left as `{{name}}` so the admin notices.
 * Three-or-more newlines collapse to two so optional empty-line vars don't
 * leave gaps.
 */
export function substituteVariables(
  template: string,
  variables: TemplateVariables,
): string {
  const substituted = template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      const value = variables[name];
      return typeof value === 'string' ? value : String(value);
    }
    return match;
  });
  // Collapse 3+ newlines to 2. Templates designed with optional `{{xLine}}`
  // vars producing empty strings end up with double-blank lines; this tidies.
  return substituted.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * DB-cached lookup. The `cache()` wrapper means within a single request,
 * re-reading the same key (e.g. for both the audit log + the actual send)
 * hits Postgres once.
 */
const fetchTemplate = cache(async (key: string) => {
  return prisma.whatsappTemplate.findUnique({
    where: { key },
    select: {
      isActive: true,
      bodyAr: true,
      bodyEn: true,
    },
  });
});

/**
 * Look up template by key + locale, substitute variables, return the body.
 * Returns null if template missing or inactive — caller MUST handle.
 */
export async function renderTemplateFromDb(
  key: string,
  locale: SupportedLocale,
  variables: TemplateVariables,
): Promise<string | null> {
  const template = await fetchTemplate(key);
  if (!template || !template.isActive) return null;
  const body = locale === 'ar' ? template.bodyAr : template.bodyEn;
  return substituteVariables(body, variables);
}

/**
 * Render a template with explicit fallback to a hardcoded default function.
 * Use this from the wrapper helpers in `lib/whatsapp/wrappers.ts` so the
 * notification path is robust to template-table corruption.
 */
export async function renderTemplateOrFallback(
  key: string,
  locale: SupportedLocale,
  variables: TemplateVariables,
  fallback: () => string,
): Promise<string> {
  const fromDb = await renderTemplateFromDb(key, locale, variables);
  return fromDb ?? fallback();
}
