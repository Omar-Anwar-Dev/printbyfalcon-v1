/**
 * Small visual affordance shown on the company profile (both B2B-facing and
 * admin-facing) so the negotiated price tier is always one glance away.
 * Sprint 7 S7-D3-T2.
 */
import type { PricingTierCode } from '@prisma/client';

type Props = {
  code: PricingTierCode;
  /** Percent off, or null for tier C. */
  defaultDiscountPercent: number | string | null;
  locale: 'ar' | 'en';
  className?: string;
};

// All tiers share the accent-soft pill (design-system.md ADR-059 — no warm
// accents structural, cyan family is the commercial identifier). Tier letter
// itself carries the differentiation via the label, not the chip color.
const TONE: Record<PricingTierCode, string> = {
  A: 'bg-accent-soft text-accent-strong border-accent/20',
  B: 'bg-accent-soft text-accent-strong border-accent/20',
  C: 'bg-accent-soft text-accent-strong border-accent/20',
};

export function PricingTierBadge({
  code,
  defaultDiscountPercent,
  locale,
  className,
}: Props) {
  const isAr = locale === 'ar';
  const pct =
    defaultDiscountPercent == null ? null : Number(defaultDiscountPercent);

  const label = isAr
    ? pct != null
      ? `المستوى ${code} — خصم ${pct}٪`
      : `المستوى ${code} — أسعار مخصّصة`
    : pct != null
      ? `Tier ${code} — ${pct}% off`
      : `Tier ${code} — Custom pricing`;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TONE[code]} ${className ?? ''}`}
    >
      {label}
    </span>
  );
}
