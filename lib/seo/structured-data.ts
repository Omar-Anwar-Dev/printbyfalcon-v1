/**
 * Sprint 13 — schema.org structured-data builders.
 *
 * Pure functions returning JSON-LD-shaped objects. Consumers serialize via
 * `<JsonLd data={...} />` (components/seo/json-ld.tsx) which emits a
 * `<script type="application/ld+json">` tag with safe escaping.
 *
 * Why structured data: Google parses these to populate Knowledge Panels,
 * Rich Results (price + availability + breadcrumbs in SERPs), and the
 * Local Pack (LocalBusiness → Maps + "near me" searches). For a new
 * Egyptian retail store, LocalBusiness is the single highest-leverage
 * SEO win after sitemap submission.
 */

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

// ─────────────────────────────────────────────────────────────
// Organization — appears on every page; tells Google "this is the company".
// ─────────────────────────────────────────────────────────────

export type OrganizationInput = {
  nameAr: string;
  nameEn: string;
  email: string;
  phoneE164: string; // e.g. "+201116527773"
  logoUrl?: string;
};

export function buildOrganization(input: OrganizationInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: input.nameEn,
    alternateName: input.nameAr,
    url: BASE_URL,
    ...(input.logoUrl
      ? {
          logo: {
            '@type': 'ImageObject',
            url: input.logoUrl.startsWith('http')
              ? input.logoUrl
              : `${BASE_URL}${input.logoUrl}`,
          },
        }
      : {}),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: input.phoneE164,
        email: input.email,
        contactType: 'customer service',
        areaServed: 'EG',
        availableLanguage: ['Arabic', 'English'],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// LocalBusiness / Store — drives Google Business Profile linkage
// + "store near me" / Maps results in Egypt.
// ─────────────────────────────────────────────────────────────

export type LocalBusinessInput = {
  nameAr: string;
  nameEn: string;
  email: string;
  phoneE164: string;
  addressAr: string;
  addressEn: string;
  /** Optional approximate latitude/longitude. Bab Al-Louk, Cairo defaults shown. */
  geo?: { latitude: number; longitude: number };
  logoUrl?: string;
  /** ISO 8601 weekly hours, e.g. "Su-Th 09:00-21:00". */
  openingHours?: string[];
};

export function buildLocalBusiness(input: LocalBusinessInput): object {
  // Cairo (Bab Al-Louk) default if no override. The owner-configured store-info
  // can ship lat/lng later; until then, the address string is the primary
  // signal Google uses anyway.
  const geo = input.geo ?? { latitude: 30.045, longitude: 31.243 };
  const openingHours =
    input.openingHours && input.openingHours.length > 0
      ? input.openingHours
      : ['Su-Th 09:00-21:00', 'Sa 10:00-18:00'];

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${BASE_URL}/#localbusiness`,
    name: input.nameEn,
    alternateName: input.nameAr,
    url: BASE_URL,
    telephone: input.phoneE164,
    email: input.email,
    image: input.logoUrl
      ? input.logoUrl.startsWith('http')
        ? input.logoUrl
        : `${BASE_URL}${input.logoUrl}`
      : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.addressEn,
      addressLocality: 'Cairo',
      addressRegion: 'Cairo Governorate',
      addressCountry: 'EG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    openingHoursSpecification: openingHours.map((spec) => {
      // Convert "Su-Th 09:00-21:00" → schema.org shape.
      const [days, hours] = spec.split(' ');
      const [opens, closes] = (hours ?? '').split('-');
      const dayMap: Record<string, string> = {
        Su: 'Sunday',
        Mo: 'Monday',
        Tu: 'Tuesday',
        We: 'Wednesday',
        Th: 'Thursday',
        Fr: 'Friday',
        Sa: 'Saturday',
      };
      const dayList = days.includes('-')
        ? expandDayRange(days, dayMap)
        : [dayMap[days] ?? days];
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayList,
        opens,
        closes,
      };
    }),
    priceRange: 'EGP',
    areaServed: 'EG',
    paymentAccepted: ['Cash', 'Credit Card', 'Debit Card'],
    currenciesAccepted: 'EGP',
  };
}

function expandDayRange(
  range: string,
  dayMap: Record<string, string>,
): string[] {
  const order = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const [from, to] = range.split('-');
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0) return [];
  const out: string[] = [];
  for (let i = a; i <= b; i++) out.push(dayMap[order[i]] ?? order[i]);
  return out;
}

// ─────────────────────────────────────────────────────────────
// WebSite — enables sitelinks search box in SERPs.
// ─────────────────────────────────────────────────────────────

export function buildWebSite(input: {
  nameEn: string;
  nameAr: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: input.nameEn,
    alternateName: input.nameAr,
    url: BASE_URL,
    inLanguage: ['ar', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/ar/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─────────────────────────────────────────────────────────────
// BreadcrumbList — appears in SERPs as the breadcrumb trail above
// the page title; can lift CTR ~30%.
// ─────────────────────────────────────────────────────────────

export type BreadcrumbItem = {
  name: string;
  /** Path starting with `/` (e.g. `/ar/products/hp-85a-comp`). */
  path: string;
};

export function buildBreadcrumbList(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// FAQPage — turns the /faq page into a Rich Result that expands
// inline in Google's SERPs.
// ─────────────────────────────────────────────────────────────

export type FaqItem = {
  question: string;
  answer: string;
};

export function buildFaqPage(items: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Helper: normalize a free-form Egyptian phone string to E.164.
// "+20 111 652 7773" → "+201116527773".
// ─────────────────────────────────────────────────────────────

export function toE164Egyptian(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Already includes country code prefix.
  if (digits.startsWith('20')) return `+${digits}`;
  // Local number starting with 0 — strip and prefix +20.
  if (digits.startsWith('0')) return `+20${digits.slice(1)}`;
  // Bare 10-digit mobile — prefix +20.
  return `+20${digits}`;
}
