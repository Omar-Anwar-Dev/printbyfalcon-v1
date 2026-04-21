/**
 * Auth helpers that sit above the session layer. Thin: the real work is in
 * `lib/session.ts`, `lib/otp.ts`, and the Server Actions in `app/actions/auth.ts`.
 *
 * Redirect targets (Sprint 7):
 *   - B2C (storefront, /account/*)  → /ar/sign-in      (phone + OTP)
 *   - B2B portal (/b2b/*)           → /ar/b2b/login    (email + password)
 *   - Admin (/admin/*)              → /ar/admin/login  (email + password, admin role check)
 */
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import type { AdminRole, User, UserType } from '@prisma/client';

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/ar/sign-in');
  return user;
}

export async function requireAdmin(allowedRoles?: AdminRole[]): Promise<User> {
  const user = await getSessionUser();
  if (!user || user.type !== 'ADMIN') redirect('/ar/admin/login');
  if (
    allowedRoles &&
    (!user.adminRole || !allowedRoles.includes(user.adminRole))
  ) {
    redirect('/ar/admin/unauthorized');
  }
  return user;
}

export async function requireType(type: UserType): Promise<User> {
  const user = await requireUser();
  if (user.type !== type) redirect('/ar');
  return user;
}

/**
 * Guard B2B-only pages — redirects unauthenticated visitors to the B2B login
 * (not the B2C sign-in) and bounces non-B2B signed-in users back home.
 * Sprint 7 company profile, bulk order (S8), etc. use this.
 */
export async function requireB2BUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/ar/b2b/login');
  if (user.type !== 'B2B') redirect('/ar');
  return user;
}

export async function getOptionalUser(): Promise<User | null> {
  return getSessionUser();
}
