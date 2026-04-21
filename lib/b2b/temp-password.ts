/**
 * Generate a cryptographically-strong temporary password for new B2B
 * accounts — issued at admin-approval time, sent in the welcome email, and
 * rotated on first login because `mustChangePassword` is set.
 *
 * 12 characters, alphanumeric (uppercase + lowercase + digits), mixed-case
 * guaranteed by construction so it passes the repo's passwordSchema
 * (`[A-Z]`, `[a-z]`, `\d` required).
 */
import { randomInt } from 'node:crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O — reduces phone confusion
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'; // no i/l/o
const DIGITS = '23456789'; // no 0/1
const ALL = UPPERCASE + LOWERCASE + DIGITS;

function pick(alphabet: string): string {
  return alphabet[randomInt(0, alphabet.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function generateTempPassword(length = 12): string {
  if (length < 6) throw new Error('temp-password.length_too_short');
  const required = [pick(UPPERCASE), pick(LOWERCASE), pick(DIGITS)];
  const rest = Array.from({ length: length - required.length }, () =>
    pick(ALL),
  );
  return shuffle([...required, ...rest]).join('');
}
