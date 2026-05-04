# Catalog Data Guide — Print By Falcon

_Last updated: 2026-05-05 (Sprint 16 quick-fill panel)_

This guide explains how catalog data (products, brands, categories, printer models, images) moves in and out of the system — day-to-day edits through the admin UI, a single-product JSON quick-fill panel for fast manual entry, plus the bulk CSV importer for onboarding and large updates.

Aimed at: the founder (Ahmed) and any data-entry person taking on catalog maintenance.

---

## 1. The three channels

| Channel | When to use | Tooling |
|---|---|---|
| **Admin UI (form)** | Day-to-day edits: fix a name/price, upload images, archive discontinued items, manage categories, wire up printer compatibility. | Browser — `https://printbyfalcon.com/ar/admin` or `/en/admin` |
| **Admin UI (JSON paste)** | Adding a single new product fast, especially when ChatGPT already drafted the names/description/specs. Same form, just pre-filled in one shot. | Browser — same admin pages, "إدخال سريع بـ JSON" panel at top of product form. See §3.7. |
| **CSV importer** | Initial catalog load, monthly large refresh, supplier price-list sync, 50+ products at once. | Command line on the VPS — `npm run seed:catalog -- <file.csv>` |

All three channels write to the same tables. You can start with CSV, polish individuals in the UI, or use JSON paste for one-off ChatGPT-generated entries.

---

## 2. Who can edit

Per ADR-016:

- **Owner** — full access to catalog + pricing + settings.
- **Ops** — full catalog access (same CRUD power) but no pricing-rules/settings screens.
- **Sales Rep** — **read-only** on catalog. They see products in their B2B context but cannot create/edit/archive.

Every create / edit / archive / delete writes an `AuditLog` row with `actor + timestamp + before/after`. The UI viewer for audit logs lands in v1.1; until then devs can query `select * from "AuditLog" where "entityType" = 'Product'` on demand.

---

## 3. Admin UI — the five screens

### 3.1 Products (`/admin/products`)

- **List view** with filters: search (SKU + name), status (Active / Archived), brand, category, authenticity (Genuine / Compatible). Up to 200 rows per view.
- **"+ New"** button at top-right → form with these fields:
  - SKU (letters, numbers, `.-_` only; must be unique across all products)
  - Brand (dropdown; create missing brands in `/admin/brands` first)
  - Category (tree dropdown with indentation; unlimited nesting per ADR-027)
  - Bilingual name (Arabic + English; both required)
  - Bilingual description (Arabic + English; optional)
  - Specifications (key/value pairs — e.g., "Page yield" → "3000 pages"; add rows as needed)
  - Base price (EGP, integer or decimal; VAT-inclusive display is handled at checkout)
  - Authenticity (Genuine / Compatible)
  - VAT exempt (checkbox; defaults off — most items are 14% VAT)
  - Status (Active / Archived)
- **Edit view** opens after create, and exposes three extra sections:
  - **Images** (§3.5 below)
  - **Compatible printers** (§3.4 below)
  - **Archive / Delete** buttons

### 3.2 Brands (`/admin/brands`)

- Simple list with bilingual names + slug.
- Create form: Arabic name, English name, slug (auto-generated from English if left blank).
- Edit: same fields + Active/Archived toggle.
- **Cannot delete** if products or printer models reference the brand — archive instead.

### 3.3 Categories (`/admin/categories`)

- Tree view (indented by depth).
- Create form: Arabic name, English name, slug, **parent category** (dropdown; "— Top level —" for roots), position (sort order within parent), status.
- Edit: same fields. The parent dropdown greys out the category itself and all its descendants to prevent cycles.
- **Cannot delete** if products OR subcategories exist — reassign products to a different category, or archive subcategories first.

### 3.4 Printer Models (`/admin/printer-models`)

- List by brand → model name.
- Create form: brand, model name (e.g., "LaserJet Pro M404"), slug, status.
- Each printer model ties to consumables via the product-edit page's "Compatible printers" picker.
- **Cannot delete** if any product is linked — remove the links from each product first.

### 3.5 Images

- On a product's edit page, the "Images" section supports:
  - **Drag-and-drop** multiple files at once onto the dashed drop zone.
  - **Click "Upload image"** to pick files via the OS dialog (also supports multiple).
  - **Per image:** bilingual alt text (saved on blur), arrow buttons to reorder, delete button.
  - Maximum 10 images per product.
- Accepted formats: JPG, PNG, WebP, AVIF. Max 5 MB per file.
- On upload the system auto-generates three WebP variants (200 px thumb, 800 px medium, ≤1600 px original). Customers see the right size automatically.
- **Deleting an image** removes both the DB row and all three on-disk variants. Reordering is instant.

### 3.6 Compatible printers (product edit page, "Compatible printers" section)

- Checkbox list of all active printer models, grouped by brand.
- Search box filters by model/brand name.
- Press **Save** — wipes the product's existing compatibility links and writes the new set atomically. The storefront product detail page immediately shows the new "Compatible printers" panel.

### 3.7 Quick-fill via JSON (Sprint 16, single-product fast lane)

Sits collapsed at the top of every product create/edit page (`إدخال سريع بـ JSON` / `Quick-fill via JSON`). For when you've already drafted a product description with ChatGPT and don't want to copy-paste each field.

**Workflow:**

1. **Click "Copy ChatGPT prompt"** — copies a ready-made bilingual prompt to your clipboard (includes the JSON schema + the list of valid brand and category names from your live catalog).
2. **Paste into ChatGPT** along with the product name / supplier link / spec sheet. ChatGPT returns a single JSON object.
3. **Copy that JSON, click "Paste from clipboard"** (or paste manually into the textarea).
4. **Click "Fill form"** — every recognised field populates, including bilingual specs.
5. **Review** — the form is a normal form again. Tweak anything that looks off, upload images, pick compatible printers, then **Save** like usual.

**Important:**

- Apply does **not** save. It only fills client state. You always click Save manually.
- Images and Compatible-printers are **out of scope** — those still need real uploads / the multi-select picker.
- `brand` and `category` accept a **name** (Arabic or English) or a slug; the panel resolves to the right id. If a name doesn't match exactly, you'll see suggestions inline.
- A green "Applied:" panel lists every field that was filled. A red "Issues:" panel lists what failed. Both can show at once.
- For power users: `window.__pbfFillProduct(jsonString)` is exposed in DevTools — useful when scripting bulk paste from a saved JSON file.

**Console one-liner example:**

```js
__pbfFillProduct(JSON.stringify({
  sku: "BROTHER-DCP-T530DW",
  brand: "Brother",
  category: "Ink Tank Printers",
  nameAr: "طابعة Brother DCP-T530DW",
  nameEn: "Brother DCP-T530DW",
  basePriceEgp: 8200,
  authenticity: "GENUINE",
  condition: "NEW",
  warranty: "ضمان سنة رسمي",
  status: "ACTIVE"
}));
```

This is the day-to-day fastest path for **single-product entry**. For 50+ products at once, the CSV importer (§4) is still faster.

---

## 4. CSV bulk import — end-to-end

### 4.1 The CSV

A template lives at `fixtures/catalog-50.csv`. Columns (exact header names, order-insensitive):

| Column | Required | Values | Example |
|---|---|---|---|
| `sku` | ✔ | letters/numbers/`.-_`, unique | `HP-CF259A` |
| `name_ar` | falls back to `name_en` | Arabic name | `خرطوشة تونر HP 59A أسود` |
| `name_en` | ✔ | English name | `HP 59A Black Toner` |
| `description_ar` | optional | Arabic description (multi-line OK if quoted) | `تونر أصلي لـ HP M404` |
| `description_en` | optional | English description | `Genuine toner for HP M404` |
| `brand_slug` | ✔ | slug of an existing (or new) brand | `hp` |
| `category_slug` | ✔ | slug of an existing (or new) category | `toner-cartridges` |
| `base_price_egp` | ✔ | integer or decimal | `2950` |
| `vat_exempt` | optional | `true` / `false` | `false` |
| `authenticity` | optional | `GENUINE` / `COMPATIBLE` (default `GENUINE`) | `GENUINE` |
| `specs_json` | optional | JSON object, string→string | `{"pageYield":"3000 pages","color":"Black"}` |
| `status` | optional | `ACTIVE` / `ARCHIVED` (default `ACTIVE`) | `ACTIVE` |

**Upsert semantics:** importing a row with an existing SKU **updates** that product. Re-running the same CSV is safe; it will not duplicate rows.

**Missing brand/category slugs get auto-created** with the slug as both Arabic and English names. Rename them in `/admin/brands` or `/admin/categories` afterwards to fix Arabic vs English copy.

### 4.2 Images

Put product images in a sibling `images/` folder next to the CSV:

```
catalog-data/
├── catalog.csv
└── images/
    ├── HP-CF259A/
    │   ├── front.jpg
    │   ├── back.jpg
    │   └── angle.webp
    ├── HP-CF258A/
    │   └── front.jpg
    └── ...
```

Images are **only imported if the product currently has zero images**. Re-running the importer won't duplicate them. Supported formats: JPG, PNG, WebP, AVIF. Recommended size: ≥ 800 × 800 px (the sharp pipeline will generate thumb/medium/original WebP variants).

### 4.3 Running the import

On the VPS:

```bash
# Dry run — parse + validate, no DB writes:
npm run seed:catalog -- --dry /var/pbf/catalog-data/catalog.csv

# Real import:
npm run seed:catalog -- /var/pbf/catalog-data/catalog.csv
```

Each row prints `ok sku=<SKU>` or `FAIL sku=<SKU>: <reason>`. The script keeps going on row failures and reports a summary at the end. Invalid rows do not abort the whole import; fix them and re-run.

### 4.4 Typical workflow for a monthly catalog refresh

1. Export your supplier's price list to Excel → save as CSV with the column names in §4.1.
2. `ssh deploy@<vps>` → `cd /var/pbf/repo`.
3. `git pull` to get the latest schema (if any migrations).
4. Drop the CSV + `images/` folder in `/var/pbf/catalog-data/`.
5. Run a dry run → fix any flagged rows.
6. Run the real import.
7. Skim `/admin/products` to spot-check a few rows.

---

## 5. Delete vs Archive — the safety net

Every archive-capable entity (Brand, Category, Product, PrinterModel) has the same two-tier removal:

| Action | When safe | Reversible? | Effect on storefront |
|---|---|---|---|
| **Archive** | Always | ✔ (Unarchive button) | Hidden from public pages. Preserved in DB so order history, invoices, and audit logs keep their references. |
| **Delete (permanent)** | Only when **no dependent rows** exist | ✘ | Removes the row and its image files (for products). |

If delete is blocked, the UI tells you what's in the way ("products or subcategories exist"). Reassign those first, or just archive the item. Archiving is the right default; delete is for mistaken rows that never had any real data.

---

## 6. Getting help

- Missing a category you need? Create it — you can always archive later.
- Picked the wrong category for 100 SKUs? Open each in admin, OR prepare a small CSV with just `sku, category_slug` plus the mandatory columns, and re-import (upsert updates category).
- Bilingual copy inconsistencies? Open the product in admin and edit directly — form saves both languages atomically.
- Image in wrong orientation? sharp honours EXIF rotation then strips it, so camera-captured images should come out upright. If a specific image is wrong, delete it and re-upload a rotated version.
- Arabic text showing as `???`? Likely a CSV encoding issue — save the CSV as **UTF-8** (not Windows-1256). Excel: File → Save As → "CSV UTF-8 (Comma delimited)".

---

## 7. What's coming later (not in Sprint 2)

- **Sprint 3**: keyword search + printer-model search + sort-by-relevance. Until then the storefront uses `newest / price-asc / price-desc` only.
- **Sprint 6**: inventory tracking — current quantity, low-stock alerts, stock-aware add-to-cart. Until then the product page shows a static "In stock" label.
- **Sprint 4**: cart + checkout (Paymob card + COD). The product detail's "Add to cart" button is a placeholder through Sprint 3.
