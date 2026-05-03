/**
 * Sprint 13 — server-rendered JSON-LD emitter.
 *
 * Use as `<JsonLd data={buildOrganization(...)} />` (or pass an array of
 * objects to emit a single combined `@graph`).
 *
 * Why a dedicated component:
 *   - Centralizes the dangerouslySetInnerHTML + escaping pattern.
 *   - Strips dangerous characters (`<`, `>`, `&`) before injection so a
 *     compromised JSON value can't break out of the script tag.
 *   - Adds a per-instance `id` so duplicate emissions can be detected in dev.
 */

type Props = {
  data: object | object[];
  id?: string;
};

function safeJson(data: unknown): string {
  return JSON.stringify(data, (_key, value) => {
    if (value === undefined) return undefined;
    return value;
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function JsonLd({ data, id }: Props) {
  // If multiple objects, wrap in @graph for a single script tag.
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : data;
  return (
    <script
      type="application/ld+json"
      id={id}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}
