import Image from 'next/image';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Server-side check at module load: do we have a real falcon icon, or should
 * we render the "PF" text fallback? Re-evaluated on each server boot — drop
 * a `public/brand/logo-icon.png` (square, ≥256px, transparent background) and
 * restart, the icon takes over everywhere automatically.
 */
const HAS_LOGO_ICON = existsSync(
  join(process.cwd(), 'public', 'brand', 'logo-icon.png'),
);

/**
 * Brand mark — the small square logo tile in the header + footer. Falls back
 * to the "PF" wordmark if the falcon asset isn't yet in place.
 */
export function BrandMark({
  size = 36,
  className = '',
  alt = 'Print By Falcon',
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-canvas text-sm font-bold text-ink ${className}`}
      style={{ width: size, height: size }}
    >
      {HAS_LOGO_ICON ? (
        <Image
          src="/brand/logo-icon.png"
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-contain p-0.5"
          priority
        />
      ) : (
        <span aria-hidden className="select-none">
          PF
        </span>
      )}
    </span>
  );
}
