import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Print By Falcon',
  description: 'Egyptian printer and supplies e-commerce',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The inner [locale] layout sets `lang` + `dir` on <html>.
  return (
    <html suppressHydrationWarning className={`${inter.variable} ${cairo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
