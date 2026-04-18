import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/ar/admin', '/en/admin'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
