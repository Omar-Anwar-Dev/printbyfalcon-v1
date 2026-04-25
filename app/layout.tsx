import type { Metadata } from 'next';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Print By Falcon',
  description: 'Egyptian printer and supplies e-commerce',
  icons: {
    icon: [
      // Same source the header/footer BrandMark consumes — drop one PNG and
      // every surface (header, footer, favicon, Apple touch icon) updates.
      { url: '/brand/logo-icon.png', sizes: 'any' },
    ],
    apple: '/brand/logo-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The inner [locale] layout sets `lang` + `dir` on <html>.
  return (
    <html
      suppressHydrationWarning
      className={`${inter.variable} ${plexArabic.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
