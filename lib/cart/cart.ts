/**
 * Cart resolver — returns (or creates) the active Cart for the current
 * request context.
 *
 *  - Logged-in users: cart keyed by userId (1:1 via Cart.userId).
 *  - Guests: cart keyed by `pbf_cart` cookie (random opaque string).
 *
 * On sign-in/registration, guest cart merging happens via `migrateGuestCart`
 * below so the items survive account creation.
 */
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import type { Cart } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';

const CART_COOKIE = 'pbf_cart';
const GUEST_COOKIE_DAYS = 30;

function generateSessionKey(): string {
  return randomBytes(24).toString('hex');
}

async function readCartCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(CART_COOKIE)?.value;
}

async function writeCartCookie(sessionKey: string): Promise<void> {
  const c = await cookies();
  c.set(CART_COOKIE, sessionKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_DAYS * 24 * 60 * 60,
  });
}

async function clearCartCookie(): Promise<void> {
  const c = await cookies();
  c.delete(CART_COOKIE);
}

/**
 * Resolve the active cart, creating one if none exists. Safe to call from any
 * Server Action or RSC context — handles cookie read/write automatically.
 */
export async function getOrCreateCart(): Promise<Cart> {
  const user = await getOptionalUser();
  if (user && user.type === 'B2C') {
    const existing = await prisma.cart.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: user.id } });
  }

  // Guest path
  const sessionKey = await readCartCookie();
  if (sessionKey) {
    const existing = await prisma.cart.findUnique({ where: { sessionKey } });
    if (existing) return existing;
  }
  const newKey = generateSessionKey();
  await writeCartCookie(newKey);
  return prisma.cart.create({ data: { sessionKey: newKey } });
}

/**
 * Read-only variant — does NOT create if missing. Use on header badge,
 * cart drawer, etc. when we don't want to allocate a guest cart eagerly.
 */
export async function getActiveCart(): Promise<Cart | null> {
  const user = await getOptionalUser();
  if (user && user.type === 'B2C') {
    return prisma.cart.findUnique({ where: { userId: user.id } });
  }
  const sessionKey = await readCartCookie();
  if (!sessionKey) return null;
  return prisma.cart.findUnique({ where: { sessionKey } });
}

/**
 * Merge any guest cart into the user's cart after sign-in/registration.
 * Called from verifyB2COtpAction after session creation.
 */
export async function migrateGuestCart(userId: string): Promise<void> {
  const sessionKey = await readCartCookie();
  if (!sessionKey) return;
  const guestCart = await prisma.cart.findUnique({
    where: { sessionKey },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } });
    await clearCartCookie();
    return;
  }

  const userCart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Merge each guest item into the user cart, summing quantities on conflict.
  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: userCart.id, productId: item.productId },
      },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + item.qty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          qty: item.qty,
          unitPriceEgpSnapshot: item.unitPriceEgpSnapshot,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  await clearCartCookie();
}
