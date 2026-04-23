import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // 'unsafe-inline' + 'unsafe-eval' are required for Next.js 15 App Router
  // hydration bootstrap without nonce rotation. Tighten with a nonce-based
  // strict-dynamic CSP post-M1 (parking-lot: Sprint 11 CSP hardening).
  // Cloudflare Web Analytics beacon (static.cloudflareinsights.com) is
  // allow-listed so CF's free analytics work without disabling it in the CF dashboard.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Cloudflare beacon POSTs its telemetry to cloudflareinsights.com.
  "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com",
  // Paymob hosted iframe for card + Fawry sub-integration (ADR-025).
  "frame-src 'self' https://accept.paymob.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'printbyfalcon.com',
      },
      {
        protocol: 'https',
        hostname: 'staging.printbyfalcon.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: cspDirectives },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
