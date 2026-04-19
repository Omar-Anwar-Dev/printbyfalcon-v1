'use client';

/**
 * Catastrophic error boundary — triggered when an error escapes the locale tree
 * (e.g. thrown inside app/layout.tsx itself or before the locale layout runs).
 * Must render its own <html>/<body> because it replaces the document root.
 * Kept intentionally minimal — Tailwind classes may not apply if CSS failed to
 * load, so we inline a minimum of critical styles via globals.css and fall back
 * to system fonts.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[global error]', error);
    }
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          backgroundColor: '#FAFAF7',
          color: '#0F172A',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            حدث خطأ غير متوقع
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#6B6B6B',
              marginTop: 16,
              lineHeight: 1.5,
            }}
          >
            نعتذر عن هذا. تم إبلاغ الفريق، ويمكنك المحاولة مرة أخرى.
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: 12,
                color: '#6B6B6B',
                marginTop: 16,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              backgroundColor: '#0E7C86',
              color: '#FAFAF7',
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              fontSize: 16,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
