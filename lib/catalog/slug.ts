/**
 * Slug utilities. Public product/brand/category slugs are URL-safe,
 * lowercase, dash-separated ASCII — derived from the English name
 * (fallback: the SKU / provided seed).
 */

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Find a unique slug by appending -2, -3, ... when collisions exist.
 * `checker` receives a candidate and returns true if the slug is already used.
 */
export async function uniqueSlug(
  seed: string,
  checker: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(seed) || 'item';
  if (!(await checker(base))) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await checker(candidate))) return candidate;
  }
  throw new Error(`Could not find a unique slug for seed: ${seed}`);
}
