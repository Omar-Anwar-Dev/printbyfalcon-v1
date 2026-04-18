/**
 * Next.js middleware runs BEFORE page rendering. Two jobs in Sprint 1:
 *
 * 1. i18n routing via next-intl — default-redirect to `/ar/...` and keep
 *    bilingual URL prefixes consistent.
 * 2. Lightweight admin gate — bounce unauthenticated users at `/admin/*`.
 *    Full role enforcement still happens in `requireAdmin()` on the page;
 *    middleware is a first-line short-circuit, not the security boundary.
 *
 * Note: middleware runs on the edge where Prisma isn't available, so we just
 * look for the session cookie's presence. Real validation happens server-side.
 */
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/lib/i18n/routing';
import { SESSION_COOKIE } from '@/lib/session';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const adminMatch = pathname.match(/^\/(ar|en)\/admin(?:\/(.*))?$/);
  if (adminMatch) {
    const subpath = adminMatch[2] ?? '';
    const isLogin = subpath === 'login' || subpath.startsWith('login/');
    if (!isLogin) {
      const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
      if (!sessionCookie) {
        const locale = adminMatch[1];
        const loginUrl = new URL(`/${locale}/admin/login`, request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match everything except Next internals, API, static files, and /storage/*
  // (served by Nginx in prod, by app/storage/[...path]/route.ts in dev).
  matcher: ['/((?!api|_next|storage|.*\\..*).*)'],
};
