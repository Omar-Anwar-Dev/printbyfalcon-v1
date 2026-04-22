'use client';

import { usePathname } from 'next/navigation';

/**
 * Floating "Chat with us" button (PRD Feature 9).
 *
 * Deep-links to the sales team's manual WhatsApp number (NOT the Whats360
 * device used for OTPs). The pre-filled message adapts to the URL so the
 * support rep knows what the customer was looking at.
 *
 * Rendered from the storefront layout when `supportNumber` is set. Hidden on
 * admin + checkout (narrow focus) to avoid distraction.
 */
const HIDDEN_PATH_PREFIXES = ['/admin', '/checkout', '/order/confirmed'];

function sanitizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function composeMessage(pathname: string, isAr: boolean): string {
  // Strip locale prefix.
  const noLocale = pathname.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';

  // Product detail: /products/[slug]
  const productMatch = noLocale.match(/^\/products\/([^/]+)/);
  if (productMatch) {
    return isAr
      ? `مرحبًا، عندي سؤال عن المنتج: ${productMatch[1]}`
      : `Hi, I have a question about product: ${productMatch[1]}`;
  }

  // Order detail (B2C/B2B): /account/orders/[id]
  const orderMatch = noLocale.match(/^\/account\/orders\/([^/]+)/);
  if (orderMatch) {
    return isAr
      ? `مرحبًا، أحتاج مساعدة بخصوص طلبي (${orderMatch[1]})`
      : `Hi, I need help with order ${orderMatch[1]}`;
  }

  // Bulk order (B2B)
  if (noLocale.startsWith('/b2b/bulk-order')) {
    return isAr
      ? 'مرحبًا، عندي استفسار عن الطلب بالجملة'
      : 'Hi, I have a question about bulk ordering';
  }

  // Cart / checkout
  if (noLocale.startsWith('/cart')) {
    return isAr
      ? 'مرحبًا، عندي سؤال عن السلة'
      : 'Hi, I have a question about my cart';
  }

  return isAr ? 'مرحبًا، عندي سؤال' : 'Hi, I have a question';
}

export function WhatsAppChatButton({
  supportNumber,
  locale,
}: {
  supportNumber: string;
  locale: string;
}) {
  const pathname = usePathname() ?? '/';
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.includes(p))) return null;

  const phone = sanitizePhone(supportNumber);
  if (!phone) return null;

  const isAr = locale === 'ar';
  const body = composeMessage(pathname, isAr);
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={isAr ? 'تواصل معنا عبر واتساب' : 'Chat with us on WhatsApp'}
      className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.52 3.48A11.86 11.86 0 0012 .1C5.38.1.09 5.4.09 12.03c0 2.11.55 4.18 1.6 6L0 24l6.18-1.62a11.94 11.94 0 005.82 1.5h.01c6.62 0 11.92-5.3 11.92-11.93 0-3.19-1.24-6.19-3.41-8.47zM12.01 21.8h-.01a9.88 9.88 0 01-5.05-1.39l-.36-.21-3.67.96.98-3.58-.24-.37a9.88 9.88 0 01-1.51-5.18c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 012.91 6.99c0 5.45-4.44 9.9-9.94 9.9zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.26-.46-2.4-1.48a9.06 9.06 0 01-1.67-2.08c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.08-.8.37s-1.05 1.03-1.05 2.5 1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.15 4.55.72.31 1.28.5 1.72.63.72.23 1.37.2 1.89.12.58-.09 1.77-.73 2.02-1.43.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
      </svg>
      <span className="hidden sm:inline">
        {isAr ? 'تواصل معنا' : 'Chat with us'}
      </span>
    </a>
  );
}
