import type { Metadata } from 'next';
import './globals.css';

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

// `<html>` + `<body>` live in `app/[locale]/layout.tsx` so we can set
// `lang` + `dir` server-side. Setting them client-side via a script (the
// previous approach) leaves the document direction unset during the first
// paint — which on RTL collapses to LTR and shifts the whole layout
// horizontally on narrow Android viewports. See ADR-060.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
