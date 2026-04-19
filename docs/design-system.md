# Print By Falcon — Design System

**Last updated:** 2026-04-19
**Status:** Living document — update when the direction evolves.
**Origin:** Foundation pass of the UI/UX refiner (post-M0, pre-Sprint 5). See [ADR-031](decisions.md) for the direction ADR.

---

## 1. Principles

Five rules that make the system legible to future contributors.

1. **Type does most of the work.** Hierarchy comes from size + weight + color — not from decoration. A screen that reads right with just type and spacing doesn't need anything else.
2. **Color is a scalpel.** One accent (Ink-Cyan) for commerce-critical moments. Neutrals carry the rest. If a screen needs "more color" to feel alive, the problem is usually hierarchy, not color.
3. **Trust is built by restraint.** No gradients on primary surfaces. No dramatic shadows. No countdown timers or flashing promo badges. Egyptian B2B procurement officers and weekend B2C buyers both read discipline as reliability.
4. **Motion hints, never performs.** Transitions are 120–280ms, ease-out-smooth. Card hover lifts `1.02×`. Toasts slide in from the top. If you can feel the animation happen, it's too long.
5. **RTL and LTR are equal citizens.** Logical properties (`ps-*`, `pe-*`, `start-*`, `end-*`) everywhere. Numerals stay LTR inside RTL via `.num`. If something only looks right in one direction, it's wrong.

---

## 2. Direction

**Trustworthy + technical + utilitarian-premium.** Verbal shorthand: "Apple-Store restraint applied to a Cairo printer-supplies shop." Differentiated from Raya / Noon / 2B — the three dominant Egyptian e-commerce retailers, all of which use warm accents (red/orange/yellow) and dense promo layouts. We borrow their **product-card anatomy, icon+text header actions, and homepage rails pattern** for shopper familiarity, but reject the visual density and warm palette. The result reads more premium-technical than warm-retail, giving us differentiated shelf appeal in search results and social sharing.

**No brand mascot, no falcon motif.** "Falcon" is a name, not a visual.

**Bilingual first-class.** Arabic (primary, RTL) and English (secondary, LTR). Typography, layout, spacing, and animation all behave symmetrically across directions.

**Dark mode:** explicitly skipped for MVP. Token system leaves room to add it later without rewriting.

---

## 3. Tokens

All tokens are defined as CSS variables in [app/globals.css](../app/globals.css) and mapped into Tailwind via [tailwind.config.ts](../tailwind.config.ts). HSL values are given so shadcn utilities (`bg-primary`, `text-muted-foreground`, etc.) continue to work; hex equivalents are for reference.

### 3.1 Color

All foreground/background pairs below hit **WCAG 2.1 AA** (4.5:1 body / 3:1 large & UI).

| Token | HSL | Hex | Role |
|---|---|---|---|
| `--canvas` | `60 23% 97%` | `#FAFAF7` | Page background (warm off-white) |
| `--paper` | `43 23% 94%` | `#F3F1EC` | Card surface, secondary panel |
| `--paper-hover` | `44 22% 90%` | `#EBE8E0` | Card hover, button ghost hover |
| `--ink` | `222 47% 11%` | `#0F172A` | Primary text, primary button fill |
| `--ink-2` | `215 28% 17%` | `#1F2937` | Primary button hover, secondary ink |
| `--muted-fg` | `0 0% 42%` | `#6B6B6B` | Secondary text (5.0:1 on canvas) |
| `--border` | `44 17% 88%` | `#E5E2DA` | Dividers, card outlines (decorative only) |
| `--border-strong` | `43 7% 53%` | `#8F8A7D` | Input borders, UI-AA borders (3.3:1) |
| `--accent` | `185 81% 29%` | `#0E7C86` | CTAs, active states (4.7:1 on canvas) |
| `--accent-strong` | `185 84% 25%` | `#0A6B74` | Body-text links (5.9:1 on canvas) |
| `--accent-soft` | `184 39% 93%` | `#E6F3F4` | Tinted bg, selection, soft highlights |
| `--success` | `142 44% 33%` | `#2F7A4B` | Success body text + dot (5.0:1) |
| `--success-soft` | `138 32% 92%` | `#E4F1E8` | Badge background |
| `--warning` | `36 63% 34%` | `#8F6320` | Warning body text + dot (5.0:1) |
| `--warning-soft` | `41 58% 91%` | `#F5ECD9` | Badge background |
| `--error` | `0 44% 49%` | `#B54747` | Error body text + dot (5.1:1) |
| `--error-soft` | `0 48% 92%` | `#F4E0E0` | Badge background |

**shadcn semantic aliases.** So existing `<Button>` and `<Card>` work without rewrites, Tailwind exposes shadcn-style aliases on top of the primitives:

| shadcn alias | Maps to | Notes |
|---|---|---|
| `background` | `canvas` | Page background |
| `foreground` | `ink` | Primary text |
| `primary` | `ink` | **Default `<Button>` is Ink**, not cyan — see §5 |
| `secondary` | `paper` | Secondary buttons |
| `card` | `paper` | Card surfaces |
| `muted` / `muted-foreground` | `paper` / `muted-fg` | Muted panels |
| `accent` / `accent-foreground` | `accent` / `canvas` | Brand accent |
| `destructive` | `error` | Destructive actions |
| `border` | `border` | Global border color |
| `input` | `border-strong` | Input borders (AA-compliant) |
| `ring` | `accent` | Focus ring (accent, 2px, 2px offset) |

### 3.2 Typography

| Token | Value |
|---|---|
| English font | **Inter** (Google Fonts, weights 400/500/600/700/800) |
| Arabic font | **IBM Plex Sans Arabic** (Google Fonts, weights 400/500/600/700) |
| Display font | *None* — use weight (700/800) + tight tracking for display presence |
| Binding | `--font-sans` + `--font-arabic` (both `next/font` with `adjustFontFallback`); swapped at `html[dir]` via [globals.css](../app/globals.css) body selector |

**Scale** — defined in Tailwind as `fontSize`:

| Tailwind class | Size / line-height / tracking | Typical use |
|---|---|---|
| `text-xs` | 12 / 1.5 / 0 | Overlines, meta, labels |
| `text-sm` | 14 / 1.5 / 0 | UI body, card text |
| `text-base` | 16 / 1.5 / 0 | Default body |
| `text-lg` | 18 / 1.5 / 0 | Emphasized body |
| `text-xl` | 20 / 1.4 / -0.005em | Small headings |
| `text-2xl` | 24 / 1.35 / -0.01em | Card titles, minor h2 |
| `text-3xl` | 32 / 1.25 / -0.015em | Section h2 |
| `text-4xl` | 48 / 1.15 / -0.02em | Page h1, hero |
| `text-5xl` | 64 / 1.05 / -0.025em | Display hero |

**Numerals inside RTL.** Wrap prices, SKUs, phone numbers, order IDs with `className="num"` — they render LTR inside right-to-left paragraphs without breaking bidi.

### 3.3 Spacing

4px baseline. Tailwind default scale plus these additions in [tailwind.config.ts](../tailwind.config.ts):

| Token | Value |
|---|---|
| `spacing.18` | 72px |
| `spacing.22` | 88px |
| `spacing.30` | 120px |
| `spacing.34` | 136px |

**Density rules.**

- Product grids / lists: 16–24px gaps (`gap-4`, `gap-6`) — balanced.
- Hero / product detail / empty states: 48–96px vertical rhythm (`py-18`, `py-22`, `py-30`) — airy.
- Card padding: 16–24px (`p-4`, `p-6`).
- Section padding: `py-16` default; `py-18`–`py-30` for hero-adjacent.

### 3.4 Radii

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 6px | Inputs, small chips |
| `rounded-md` / `rounded` / `rounded-lg` | 10px | Buttons, cards, most surfaces |
| `rounded-xl` | 16px | Modals, hero cards, large containers |
| `rounded-2xl` | 20px | Feature cards (rare) |
| `rounded-full` | pill | Badges, dots, status chips |

### 3.5 Shadows

Only two elevations. Shipping discipline prevents the "every card has a different shadow" drift that plagues shadcn projects.

| Token | Value | Use |
|---|---|---|
| `shadow-card` | `0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.04)` | Cards, product tiles |
| `shadow-popover` | `0 8px 24px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)` | Modals, popovers, dropdowns, toasts, card-hover lift |

Focus ring uses native `outline` (not `box-shadow`): 2px accent with 2px offset, defined in `:focus-visible` at [globals.css](../app/globals.css).

### 3.6 Motion

| Token | Value |
|---|---|
| `ease-out-smooth` | `cubic-bezier(0.2, 0.7, 0.3, 1)` |
| `duration-fast` | 120ms (micro-interactions: scale on tap) |
| `duration-base` | 180ms (default transitions) |
| `duration-slow` | 280ms (image scale on card hover) |

**Animations** (keyframes + classes in Tailwind):

| Class | Use |
|---|---|
| `animate-fade-in` | Modal overlays, tooltips |
| `animate-slide-up` | Toasts (direction-agnostic, safe for RTL) |
| `animate-slide-in-start` | Mobile nav panel (start = left in LTR, right in RTL) |
| `animate-slide-in-end` | (Reserved for end-aligned drawers) |
| `animate-scale-in` | Dropdown menus (CategoryMenu) |

**`prefers-reduced-motion`** — honored in [globals.css](../app/globals.css); all durations collapse to 1ms.

### 3.7 Breakpoints

Tailwind defaults. Mobile-first — design at 375px, scale up.

| Class | Min width |
|---|---|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |
| `2xl:` | 1280px (container cap) |

---

## 4. Components inventory

Authoritative catalog of shared UI. Update when adding or substantially changing shared components.

### 4.1 shadcn primitives (foundation)
| Component | Path | Variants / notes |
|---|---|---|
| `Button` | [components/ui/button.tsx](../components/ui/button.tsx) | Variants: `default` (ink), **`accent`** (brand cyan — commerce CTAs only), `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `sm`, `default`, `lg`, `icon`. |
| `Card` | components/ui/card.tsx | shadcn default |
| `Input`, `Textarea`, `Label`, `Select` | components/ui/ | shadcn defaults |
| `Dialog` | components/ui/dialog.tsx | Radix-backed |
| **`ToastProvider` + `useToast`** | [components/ui/toast.tsx](../components/ui/toast.tsx) | **New in this pass.** Dependency-free toast system. Mounted in [app/[locale]/layout.tsx](../app/[locale]/layout.tsx). Call `const { toast } = useToast(); toast({ title, description?, variant? })`. Variants: `default`, `success`, `warning`, `error`. Auto-dismiss 4s (override via `durationMs`). Positioned `top-end`, `animate-slide-up`. |

### 4.2 Layout / shell
| Component | Path | Notes |
|---|---|---|
| `SiteHeader` | [components/site-header.tsx](../components/site-header.tsx) | Sticky, `bg-canvas/90 backdrop-blur`. Contains logo + desktop nav + search + icon+text actions (cart, account) + language switcher + `<MobileNav>`. |
| `SiteFooter` | [components/site-footer.tsx](../components/site-footer.tsx) | 4-column on desktop (brand/contact, Shop, Account, Support) + legal row. |
| **`MobileNav`** | [components/mobile-nav.tsx](../components/mobile-nav.tsx) | **New.** Hamburger trigger + slide-in panel (from start-edge). Expands category children. Full-width ≤768px. |
| `CategoryMenu` | [components/category-menu.tsx](../components/category-menu.tsx) | Desktop category dropdown. Restyled to new tokens. |
| `LanguageSwitcher` | [components/language-switcher.tsx](../components/language-switcher.tsx) | Segmented-control styled pill: ink on active, border + muted on inactive. |
| `HeaderSearch` | components/header-search.tsx | Unchanged this pass; proper ARIA combobox. |

### 4.3 Catalog
| Component | Path | Notes |
|---|---|---|
| `ProductCard` | [components/catalog/product-card.tsx](../components/catalog/product-card.tsx) | Card anatomy: image (aspect-square) → brand overline → title → price row + stock pill. Uses `bg-paper` + `shadow-card` + `hover:-translate-y-0.5`. `ProductCardSkeleton` uses `shimmer` utility. |
| `StockBadge` | [components/catalog/stock-badge.tsx](../components/catalog/stock-badge.tsx) | Token-aligned pill (success-soft/warning-soft/paper-hover). Replaces hardcoded emerald/amber/neutral. |
| `ProductGallery`, `AddToCartButton`, `SearchFiltersSidebar`, `MobileFiltersButton` | components/catalog/ | Unchanged this pass — inherit tokens; defer polish to M1-eve pass. |

### 4.4 Feedback surfaces (new)
| Surface | Path | Purpose |
|---|---|---|
| Toast system | [components/ui/toast.tsx](../components/ui/toast.tsx) | Transient notifications |
| Locale 404 | [app/[locale]/not-found.tsx](../app/[locale]/not-found.tsx) | Branded 404 inside /ar, /en |
| Root 404 | [app/not-found.tsx](../app/not-found.tsx) | Fallback 404 for unknown locale prefixes |
| Locale error | [app/[locale]/error.tsx](../app/[locale]/error.tsx) | Client error boundary inside locale tree |
| Global error | [app/global-error.tsx](../app/global-error.tsx) | Catastrophic fallback (renders own `<html>`/`<body>`, inline styles) |
| Locale loading | [app/[locale]/loading.tsx](../app/[locale]/loading.tsx) | Default suspense skeleton (hero + 8 product card skeletons with `shimmer`) |

---

## 5. Iconography

**Library:** [lucide-react](https://lucide.dev). Stock 0.454.0.

| Setting | Value |
|---|---|
| Default size | `h-5 w-5` (20px) |
| Stroke width | `strokeWidth={1.75}` |
| Color | Currentcolor (inherit from parent; use `text-muted-foreground`, `text-accent-strong`, etc.) |

**Canonical icons** — use these consistently instead of picking synonyms per feature:

| Meaning | Icon | Notes |
|---|---|---|
| Cart | `ShoppingBag` | Not `ShoppingCart` |
| User / Account | `User` | |
| Sign in | `LogIn` | |
| Business login | `Building2` | |
| Search | `Search` | |
| Menu (mobile) | `Menu` | |
| Close | `X` | |
| Expand | `ChevronDown` | Rotate 180° when open |
| Forward navigation | `ArrowRight` | Apply `rtl:rotate-180` |
| Back navigation | `ArrowLeft` | Apply `rtl:rotate-180` |
| Printer | `Printer` | |
| Consumables / packaging | `Package` | |
| Address | `MapPin` | |
| WhatsApp / chat | `MessageCircle` | |
| Email | `Mail` | |
| Success | `CheckCircle2` | |
| Warning | `AlertTriangle` | |
| Error | `XCircle` | |
| Info / default toast | `Info` | |
| Shield (trust / auth) | `ShieldCheck` | |
| Shipping | `Truck` | |
| Payment | `CreditCard` | |
| 404 | `FileQuestion` | |
| Retry | `RotateCcw` | |

**Directional icons in RTL.** Apply `rtl:rotate-180` on `Arrow*` and `Chevron*` (when used as directional, not as an expand affordance). Symmetric icons (`ShoppingBag`, `X`, `Menu`) need no mirroring.

---

## 6. Accessibility baseline

- **WCAG 2.1 AA** for storefront + B2B portal. Admin best-effort.
- Every color token pair documented in §3.1 is contrast-verified; see ADR-031 for the audit.
- Every interactive element is keyboard-reachable and has the accent focus-visible ring (`:focus-visible` in globals.css).
- Form inputs use persistent labels — never placeholder-only.
- Landmarks correct: `<header>`, `<main>`, `<footer>`, `<nav>`.
- `prefers-reduced-motion` collapses all animations/transitions to 1ms.
- Color is never the only signal — stock states pair a dot with a label; toasts pair an icon with text.

---

## 7. Don'ts

Enforced by code review. If a change violates these, push back.

1. **No warm accent (red / orange / amber / gold) anywhere structural.** The cyan-on-cream identity dies the moment a red "SALE" banner appears. Promotions: use `bg-accent-soft` pill, weight, or typography — never a second saturated hue.
2. **No gradients on primary surfaces.** Exception: the hero's single ultra-subtle `radial-gradient` at `[ellipse_at_top,hsl(var(--accent-soft))_0%,hsl(var(--canvas))_60%]` and an absolute-positioned blur blob on the compatibility CTA. Both approved; don't add more.
3. **No drop shadows > `shadow-popover`.** No `shadow-2xl`, no dramatic hero elevations.
4. **No `font-family: Cairo` anywhere.** `--font-arabic` binds to IBM Plex Sans Arabic. Grep for stray Cairo usage before merging.
5. **No icon-only controls** except universal symbols (search, close, cart-count, menu). Every other icon gets a text label.
6. **No accent-cyan on destructive or warning states.** Cyan = desirable action. Destructive = `variant="destructive"` (error red).
7. **No `bg-amber-*`, `bg-emerald-*`, `bg-red-*`, etc.** Use `bg-warning-soft`, `bg-success-soft`, `bg-error-soft` — tokens, not Tailwind's raw palette.
8. **No `text-primary` hover on ink text.** It renders dark-on-dark (primary → ink). Use `hover:text-accent-strong` instead.
9. **No hardcoded `ml-*` / `mr-*` / `left-*` / `right-*` on layout-critical UI.** Use `ms-*` / `me-*` / `start-*` / `end-*` so RTL mirrors automatically.
10. **No display font.** Weight + tracking carry display hierarchy. No Fraunces, no Space Grotesk, no Instrument Serif.

---

## 8. Patterns

Common compositions to borrow from instead of reinventing.

### 8.1 Section head
```tsx
<div>
  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
    Overline
  </p>
  <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
    Section title
  </h2>
</div>
```

### 8.2 Accent CTA button
```tsx
<Button variant="accent" size="lg">
  Buy now
  <ArrowRight className="ms-2 h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
</Button>
```

### 8.3 Status pill
```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
  <span className="h-1.5 w-1.5 rounded-full bg-success" />
  In stock
</span>
```

### 8.4 Hero card (type-led, no imagery)
Soft `radial-gradient` from `accent-soft` at top, content max-width capped, single `variant="accent"` CTA + one `variant="outline"` secondary. See [app/[locale]/page.tsx](../app/[locale]/page.tsx).

### 8.5 Value-prop strip
4 micro-cards on `bg-paper`, icon in `bg-canvas` square, `border-s` dividers in `sm:` and `lg:` breakpoints. See [app/[locale]/page.tsx](../app/[locale]/page.tsx).

---

## 9. Scope boundaries (this pass)

**In scope (completed 2026-04-19):**
- Tokens (colors, type, spacing, radii, shadows, motion)
- Global shell: header, footer, mobile nav, language switcher, category menu
- Homepage redesign (hero + value-prop strip + category rail + featured products + brand rail + compatibility CTA)
- Feedback layer: toast system, locale 404, global 404, locale error boundary, global error boundary, loading skeleton
- ProductCard + StockBadge refinement (since they render on the homepage)

**Out of scope (deferred to M1-eve polish pass):**
- Products list / detail page polish
- Search / filters sidebar / mobile filters modal polish
- Cart / checkout / order confirmed polish
- Account / addresses / orders polish
- Auth surfaces (sign-in, login) polish
- Admin surfaces (any polish)

Sprints 5–12 should ship feature work that **conforms to this system** without re-polishing it. If a feature needs something outside this system, raise it as an ADR amendment.

---

## 10. Change log

| Date | Change | Reason |
|---|---|---|
| 2026-04-19 | Initial design system | Foundation UI/UX polish pass after M0 (Sprint 4 close); ADR-031 |
