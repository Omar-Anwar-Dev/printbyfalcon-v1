# Print By Falcon

E-commerce platform for printers and printing supplies — B2C + B2B, Egypt-first, bilingual (Arabic/English).

- **Stack:** Next.js 15 (App Router, TypeScript) · PostgreSQL 16 · Prisma · next-intl · Tailwind + shadcn/ui · pg-boss · Nodemailer · Meta WhatsApp Cloud API · Paymob (card) + COD payments (wired in later sprints; Fawry direct integration descoped per ADR-022).
- **Canonical docs:** [`docs/PRD.md`](docs/PRD.md), [`docs/architecture.md`](docs/architecture.md), [`docs/decisions.md`](docs/decisions.md), [`docs/implementation-plan.md`](docs/implementation-plan.md), [`docs/progress.md`](docs/progress.md).
- **Sprint 1 external runbook:** [`docs/sprint1-external-tasks.md`](docs/sprint1-external-tasks.md) — VPS setup, merchant applications, WhatsApp templates, UptimeRobot, Netdata, DNS, SSL.

---

## Prerequisites

- Node.js 22 LTS (or 20.10+)
- Docker Desktop (for local Postgres) or a local Postgres 16
- Git

Check versions:

```bash
node --version  # v22.x
npm --version
docker --version
```

---

## Local dev — 30-minute fresh clone

```bash
# 1. Clone and install
git clone git@github.com:YOUR-ORG/print-by-falcon.git
cd print-by-falcon
npm ci

# 2. Environment
cp .env.example .env.local
# Edit .env.local and set:
#   AUTH_SECRET=<openssl rand -base64 32>
#   OWNER_TEMP_PASSWORD=<any strong value>

# 3. Start a local Postgres (via Docker)
docker run -d \
  --name pbf-pg-local \
  -e POSTGRES_USER=pbf -e POSTGRES_PASSWORD=pbf -e POSTGRES_DB=pbf_dev \
  -p 5432:5432 postgres:16-alpine

# 4. Migrate + seed
npx prisma migrate dev --name init
npx prisma db seed  # seeds the Owner admin; password reset forced on first login

# 5. Run
npm run dev                  # app on http://localhost:3000
npm run worker               # background worker (separate terminal)
```

Visit:
- `http://localhost:3000/ar` — storefront (Arabic, RTL)
- `http://localhost:3000/en` — storefront (English)
- `http://localhost:3000/ar/login` — B2B email+password login
- `http://localhost:3000/ar/sign-in` — B2C phone → WhatsApp OTP (in dev mode the code is printed to the server console)
- `http://localhost:3000/ar/admin/login` — admin login
- `http://localhost:3000/api/health` — liveness probe

---

## Scripts cheat sheet

| Command | What it does |
|---|---|
| `npm run dev` | Run Next.js dev server on port 3000 |
| `npm run worker` | Run the pg-boss worker locally (heartbeat, email, WhatsApp) |
| `npm run build` | Production build |
| `npm run start` | Start the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Vitest (unit tests) |
| `npm run format` | Prettier, write |
| `npm run prisma:studio` | Prisma Studio (browse DB) |
| `npm run prisma:migrate` | Create + apply a new migration locally |
| `npm run prisma:seed` | Run the Owner-admin seed idempotently |

---

## Environment variables

See `.env.example` (dev) and `.env.production.example` / `.env.staging.example` (VPS).

High-impact ones to know:

| Var | Dev default | Prod meaning |
|---|---|---|
| `AUTH_SECRET` | 32-byte random | Signs session tokens — **rotate means everyone is logged out** |
| `DATABASE_URL` | Local Docker | VPS Postgres container on the internal network |
| `OTP_DEV_MODE` | `true` | Skips Meta API, logs OTP codes to server console |
| `OWNER_EMAIL` / `OWNER_TEMP_PASSWORD` | seeds first admin | **rotated on first login**; retained only as a one-shot bootstrap |
| `WHATSAPP_CLOUD_API_TOKEN` | blank | When set with `OTP_DEV_MODE=false`, OTPs go through Meta |
| `SENTRY_DSN` | blank | GlitchTip DSN; errors show up at `errors.printbyfalcon.com` |

---

## Repository layout

```
app/                    # Next.js App Router
  [locale]/            # /ar/* and /en/* routes
  actions/             # Server Actions (auth in Sprint 1)
  api/                 # Route handlers (health, webhooks)
components/            # React components (shadcn-style UI + site chrome)
lib/                   # Pure TypeScript: db, logger, session, otp, i18n, validation, rate-limit
worker/                # pg-boss worker process (runs in its own Docker container)
prisma/                # schema.prisma + seed
messages/              # next-intl catalogs (ar.json, en.json)
docker/                # Dockerfiles + compose + nginx + postgres configs
scripts/               # backup/restore/deploy shell scripts (run on VPS)
docs/                  # PRD, architecture, decisions, plan, progress, runbooks
.github/workflows/     # CI + deploy-staging
```

---

## Security notes (Sprint 1 scope)

- **Passwords:** bcrypt cost 12. Stored in `User.passwordHash`. First Owner is force-reset on first login (`mustChangePassword: true`).
- **Sessions:** 30-day rolling, DB-backed. Token in HttpOnly+Secure+SameSite=Lax cookie; only the SHA-256 lives in DB.
- **OTPs:** 6-digit, SHA-256 hashed, 5-min expiry, max 3 attempts, rate-limited (3/phone/30min).
- **Rate limits:** DB sliding-window — OTP request, B2B login, password reset.
- **CSRF:** Next.js Server Actions are origin-checked by default.
- **Secrets in chat:** any secret shared in an AI chat log is considered compromised. The `OWNER_TEMP_PASSWORD` seeded during Sprint 1 **must** be rotated on first login (the UI enforces this).

---

## Contributing

- Single `main` branch. Feature branches merged via PR.
- `npm run lint && npm run typecheck && npm run build` must be green before merge.
- `docs/progress.md` is the running log of sprint progress — update it whenever you complete a tracked task.
- New non-trivial technical decisions get an ADR appended to `docs/decisions.md`.

---

## Support & escalation

- Owner: Omar — `support@printbyfalcon.com`
- Error tracking: `https://errors.printbyfalcon.com` (basic-auth, admin-only)
- Uptime: UptimeRobot dashboard (see runbook)
