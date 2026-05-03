/**
 * M1 readiness check — pre-deploy go/no-go script.
 *
 * Usage:
 *   tsx scripts/m1-check.ts                              # static checks only
 *   tsx scripts/m1-check.ts --env .env.production        # parse + check env
 *   tsx scripts/m1-check.ts --url https://staging.printbyfalcon.com   # also probe live
 *   tsx scripts/m1-check.ts --env .env.production --url https://staging.printbyfalcon.com
 *
 * Or via npm: `npm run m1:check -- --url https://staging.printbyfalcon.com`
 *
 * Exit codes:
 *   0 — all checks PASS (warnings allowed)
 *   1 — at least one FAIL (do NOT deploy)
 *   2 — usage error (bad CLI args / file not found)
 *
 * What it does NOT replace: the human-side ops checklist in
 * docs/m1-readiness.md (lawyer review of Privacy/Terms, friendly-tester
 * outreach, Cloudflare DNS records, etc.). This script verifies the
 * mechanical / runtime gates only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkProductionEnv } from '../lib/env-check';
import { isPaymobEnabled } from '../lib/payments/feature-flags';

type CheckTone = 'PASS' | 'FAIL' | 'WARN' | 'INFO';

type CheckResult = {
  tone: CheckTone;
  name: string;
  detail?: string;
};

const results: CheckResult[] = [];

function log(r: CheckResult): void {
  results.push(r);
  const icon =
    r.tone === 'PASS'
      ? '✅'
      : r.tone === 'FAIL'
        ? '❌'
        : r.tone === 'WARN'
          ? '⚠️ '
          : 'ℹ️ ';
  const detail = r.detail ? `  — ${r.detail}` : '';
  // eslint-disable-next-line no-console
  console.log(`${icon} ${r.name}${detail}`);
}

function section(title: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
  // eslint-disable-next-line no-console
  console.log('─'.repeat(title.length));
}

// ─────────────────────────────────────────────────────────────
// CLI argument parsing
// ─────────────────────────────────────────────────────────────
function parseArgs(argv: string[]): { envPath?: string; url?: string } {
  const out: { envPath?: string; url?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--env' && argv[i + 1]) {
      out.envPath = argv[i + 1];
      i++;
    } else if (arg === '--url' && argv[i + 1]) {
      out.url = argv[i + 1].replace(/\/$/, '');
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg && !arg.startsWith('--')) {
      // ignore positional
    }
  }
  return out;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`Usage: tsx scripts/m1-check.ts [--env <path>] [--url <https://...>]

Pre-deploy go/no-go check for the Print By Falcon M1 launch.

Options:
  --env <path>   Parse a .env file and run checkProductionEnv against it.
                 Example: --env .env.production
  --url <URL>    Probe a live deployment (storefront + admin + sitemap +
                 security headers). Use staging URL before promoting to prod.
  --help, -h     This message.

Exit codes:
  0 — all green (warnings ok)
  1 — at least one FAIL (do not deploy)
  2 — usage error
`);
}

// ─────────────────────────────────────────────────────────────
// .env file → process.env-shaped record
// ─────────────────────────────────────────────────────────────
function parseEnvFile(filePath: string): Record<string, string> {
  const text = readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip wrapping quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ─────────────────────────────────────────────────────────────
// Static checks
// ─────────────────────────────────────────────────────────────
async function runStaticChecks(envPath: string | undefined): Promise<void> {
  section('Static checks');

  // Schema check — verify prisma/schema.prisma exists + is non-empty.
  // (Full prisma validate runs separately via `npx prisma validate` — keeping
  // this script dependency-free of the Prisma CLI.)
  try {
    const schema = readFileSync(
      resolve(process.cwd(), 'prisma/schema.prisma'),
      'utf-8',
    );
    if (schema.length < 100 || !schema.includes('generator client')) {
      log({
        tone: 'FAIL',
        name: 'prisma schema present',
        detail: 'schema file looks malformed',
      });
    } else {
      log({ tone: 'PASS', name: 'prisma schema present and parseable-shaped' });
    }
  } catch {
    log({
      tone: 'FAIL',
      name: 'prisma schema present',
      detail: 'prisma/schema.prisma not found',
    });
  }

  // Env file check.
  if (!envPath) {
    log({
      tone: 'INFO',
      name: 'env-check skipped',
      detail: 'pass --env .env.production to validate',
    });
  } else {
    try {
      const envContents = parseEnvFile(envPath);
      // Force NODE_ENV=production for the check (the file should set it but
      // some operators leave it implicit). The cast is safe here — we've just
      // built the record and we're about to read from it as a env-shaped bag.
      if (!envContents.NODE_ENV) envContents.NODE_ENV = 'production';
      // checkProductionEnv reads from a string-keyed bag; the ProcessEnv typing
      // requires NODE_ENV which we've just ensured exists.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const envForCheck = envContents as any;
      const r = checkProductionEnv(envForCheck);
      if (r.ok) {
        log({
          tone: 'PASS',
          name: `env-check on ${envPath}`,
          detail: isPaymobEnabled(envForCheck)
            ? 'PAYMOB enabled (default) — full Paymob keys required + present'
            : 'COD-only posture (PAYMENTS_PAYMOB_ENABLED=false) — Paymob keys not required',
        });
      } else {
        log({
          tone: 'FAIL',
          name: `env-check on ${envPath}`,
          detail: r.errors.join('; '),
        });
      }

      // Sanity warn for known-bad placeholder values that operators leave behind.
      const placeholderHits: string[] = [];
      for (const [k, v] of Object.entries(envContents)) {
        if (typeof v !== 'string' || v.length === 0) continue;
        if (
          v === 'CHANGEME' ||
          v === 'CHANGEME-ROTATE-IMMEDIATELY' ||
          v.startsWith('CHANGEME')
        ) {
          placeholderHits.push(k);
        }
      }
      if (placeholderHits.length > 0) {
        log({
          tone: 'FAIL',
          name: 'no CHANGEME placeholders in env',
          detail: placeholderHits.join(', '),
        });
      } else {
        log({ tone: 'PASS', name: 'no CHANGEME placeholders in env' });
      }
    } catch (err) {
      log({
        tone: 'FAIL',
        name: `env file readable: ${envPath}`,
        detail: (err as Error).message,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Live URL probes
// ─────────────────────────────────────────────────────────────
type ProbeResult = {
  ok: boolean;
  status?: number;
  body?: string;
  headers?: Headers;
  error?: string;
};

async function probe(
  url: string,
  opts: { method?: string; redirect?: 'follow' | 'manual' } = {},
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      redirect: opts.redirect ?? 'manual',
      headers: { 'User-Agent': 'pbf-m1-check/1.0' },
    });
    const body = res.body ? await res.text().catch(() => '') : '';
    return {
      ok: true,
      status: res.status,
      body,
      headers: res.headers,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function runLiveChecks(baseUrl: string): Promise<void> {
  section(`Live checks against ${baseUrl}`);

  // Health endpoint
  const health = await probe(`${baseUrl}/api/health`);
  if (!health.ok) {
    log({
      tone: 'FAIL',
      name: '/api/health reachable',
      detail: health.error ?? 'no response',
    });
  } else if (health.status !== 200) {
    log({
      tone: 'FAIL',
      name: '/api/health 200',
      detail: `got ${health.status}`,
    });
  } else if (!health.body || !/"ok"\s*:\s*true/.test(health.body)) {
    log({
      tone: 'WARN',
      name: '/api/health body shape',
      detail: 'expected { ok: true }',
    });
  } else {
    log({ tone: 'PASS', name: '/api/health 200 + { ok: true }' });
  }

  // Storefront AR
  const home = await probe(`${baseUrl}/ar`);
  if (!home.ok || home.status !== 200) {
    log({
      tone: 'FAIL',
      name: '/ar storefront 200',
      detail: home.error ?? `status ${home.status}`,
    });
  } else {
    log({ tone: 'PASS', name: '/ar storefront 200' });
  }

  // Catalog
  const catalog = await probe(`${baseUrl}/ar/products`);
  if (!catalog.ok || catalog.status !== 200) {
    log({
      tone: 'FAIL',
      name: '/ar/products 200',
      detail: catalog.error ?? `status ${catalog.status}`,
    });
  } else {
    log({ tone: 'PASS', name: '/ar/products 200' });
  }

  // Admin redirect (unauthed should NOT 200)
  const admin = await probe(`${baseUrl}/ar/admin`);
  if (!admin.ok) {
    log({
      tone: 'FAIL',
      name: '/ar/admin gated',
      detail: admin.error ?? 'no response',
    });
  } else if (admin.status === 200) {
    log({
      tone: 'FAIL',
      name: '/ar/admin gated',
      detail: 'admin returned 200 unauth — gate broken',
    });
  } else if (
    admin.status === 302 ||
    admin.status === 307 ||
    admin.status === 308 ||
    admin.status === 401 ||
    admin.status === 403
  ) {
    log({
      tone: 'PASS',
      name: '/ar/admin gated',
      detail: `redirect/deny (${admin.status})`,
    });
  } else {
    log({
      tone: 'WARN',
      name: '/ar/admin gated',
      detail: `unexpected ${admin.status}`,
    });
  }

  // sitemap
  const sitemap = await probe(`${baseUrl}/sitemap.xml`);
  if (!sitemap.ok || sitemap.status !== 200) {
    log({
      tone: 'WARN',
      name: '/sitemap.xml 200',
      detail: sitemap.error ?? `status ${sitemap.status}`,
    });
  } else {
    log({ tone: 'PASS', name: '/sitemap.xml 200' });
  }

  // Feedback endpoint reachable (Sprint 12)
  const feedback = await probe(`${baseUrl}/ar/feedback`);
  if (!feedback.ok || feedback.status !== 200) {
    log({
      tone: 'WARN',
      name: '/ar/feedback 200',
      detail: feedback.error ?? `status ${feedback.status}`,
    });
  } else {
    log({ tone: 'PASS', name: '/ar/feedback 200' });
  }

  // Security headers (use storefront response)
  const headers = home.ok ? home.headers : null;
  if (!headers) {
    log({
      tone: 'WARN',
      name: 'security headers',
      detail: 'no response to inspect',
    });
  } else {
    const required = [
      ['Content-Security-Policy', 'CSP'],
      ['Strict-Transport-Security', 'HSTS'],
      ['X-Content-Type-Options', 'X-Content-Type-Options'],
      ['Referrer-Policy', 'Referrer-Policy'],
    ] as const;
    const missing: string[] = [];
    for (const [hdr, label] of required) {
      if (!headers.get(hdr)) missing.push(label);
    }
    if (missing.length > 0) {
      log({
        tone: 'FAIL',
        name: 'security headers',
        detail: `missing: ${missing.join(', ')}`,
      });
    } else {
      log({
        tone: 'PASS',
        name: 'security headers (CSP + HSTS + nosniff + referrer)',
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const { envPath, url } = parseArgs(process.argv.slice(2));

  // eslint-disable-next-line no-console
  console.log(
    `M1 Readiness Check — ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
  );

  await runStaticChecks(envPath);
  if (url) await runLiveChecks(url);

  // Summary
  const passes = results.filter((r) => r.tone === 'PASS').length;
  const fails = results.filter((r) => r.tone === 'FAIL').length;
  const warns = results.filter((r) => r.tone === 'WARN').length;

  section('Summary');
  // eslint-disable-next-line no-console
  console.log(`PASS: ${passes}   FAIL: ${fails}   WARN: ${warns}`);

  if (fails > 0) {
    // eslint-disable-next-line no-console
    console.log('\n❌ DO NOT DEPLOY — resolve FAILs first.');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    warns > 0
      ? '\n⚠️  Ready to deploy (warnings noted; review them).'
      : '\n✅ Ready to deploy.',
  );
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('m1-check failed unexpectedly:', err);
  process.exit(2);
});
