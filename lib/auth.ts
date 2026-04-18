/**
 * Auth helpers that sit above the session layer. Thin: the real work is in
 * `lib/session.ts`, `lib/otp.ts`, and the Server Actions in `app/actions/auth.ts`.
 */
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import type { AdminRole, User, UserType } from '@prisma/client';

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/ar/login');
  return user;
}

export async function requireAdmin(
  allowedRoles?: AdminRole[],
): Promise<User> {
  const user = await requireUser();
  if (user.type !== 'ADMIN') redirect('/ar/admin/login');
  if (allowedRoles && (!user.adminRole || !allowedRoles.includes(user.adminRole))) {
    redirect('/ar/admin/unauthorized');
  }
  return user;
}

export async function requireType(type: UserType): Promise<User> {
  const user = await requireUser();
  if (user.type !== type) redirect('/ar');
  return user;
}

export async function getOptionalUser(): Promise<User | null> {
  return getSessionUser();
}
