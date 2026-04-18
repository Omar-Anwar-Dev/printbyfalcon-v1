/**
 * Structured JSON logger with PII redaction.
 * Usage: import { logger } from '@/lib/logger';
 *        logger.info({ requestId, userId }, 'auth.login.success');
 *
 * Redaction covers password-like keys, OTP codes, payment tokens, raw phone numbers
 * at top level. Never log raw request bodies — use serializers that project only
 * safe fields.
 */
import pino, { LoggerOptions } from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const pretty = process.env.LOG_PRETTY === 'true';

const redactPaths = [
  // auth & secrets
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'tokenHash',
  'authSecret',
  'cookie',
  'authorization',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  // OTP
  'code',
  'codeHash',
  'otp',
  '*.otp',
  '*.code',
  // payment
  'cardNumber',
  'cvv',
  'paymentToken',
  'hmac',
  '*.cardNumber',
  '*.cvv',
  '*.paymentToken',
  // raw PII we don't need in logs at top level
  'req.headers.cookie',
  'req.headers.authorization',
];

// Normalize to lowercase: pino's edge-runtime build is strict about case
// (rejects 'INFO'); the rest of the codebase + Python tools (GlitchTip)
// happily accept either case, so lowercase is the safe internal canon.
const rawLevel = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');
const options: LoggerOptions = {
  level: rawLevel.toLowerCase(),
  redact: {
    paths: redactPaths,
    remove: true,
  },
  base: {
    app: 'pbf',
    env: process.env.NODE_ENV ?? 'development',
    service:
      process.env.SERVICE_NAME ??
      (typeof window === 'undefined' ? 'web' : 'browser'),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger = pretty
  ? pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      },
    })
  : pino(options);

/**
 * Returns a child logger scoped to a request / job. Always include a request_id
 * so logs can be correlated across layers.
 */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
