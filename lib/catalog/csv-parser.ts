/**
 * Pure CSV parsing + validation for the catalog seeder (Sprint 11 S11-D6-T1
 * hardening pass).
 *
 * Previously lived inline in `scripts/seed-catalog.ts`. Split out so edge
 * cases (BOM, duplicate SKUs, missing headers, Arabic Unicode quirks) can be
 * unit-tested without importing the Prisma-bound seeder script.
 */

export type CsvRow = {
  sku: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  brand_slug: string;
  category_slug: string;
  base_price_egp: string;
  vat_exempt: string;
  authenticity: string;
  specs_json: string;
  status: string;
};

export const REQUIRED_HEADERS = ['sku', 'name_en', 'base_price_egp'] as const;

export type CsvParseError = {
  kind:
    | 'empty_file'
    | 'missing_header'
    | 'duplicate_sku'
    | 'invalid_price'
    | 'invalid_authenticity'
    | 'invalid_status'
    | 'invalid_specs_json'
    | 'row_missing_sku'
    | 'row_missing_name_en'
    | 'name_too_long';
  row?: number;
  column?: string;
  value?: string;
  message: string;
};

export type CsvParseResult = {
  rows: CsvRow[];
  errors: CsvParseError[];
  warnings: CsvParseError[];
};

const MAX_NAME_CHARS = 200;

/**
 * Normalize a string for CSV ingestion:
 *   - Strip UTF-8 BOM (EF BB BF) from Excel-exported files
 *   - Strip tatweel (ـ), zero-width joiner/non-joiner, non-breaking spaces
 *   - NFKC-normalize Arabic canonical forms so lookups match consistently
 *   - Trim leading/trailing whitespace
 */
function normalizeCell(raw: string): string {
  if (!raw) return '';
  let v = raw;
  if (v.charCodeAt(0) === 0xfeff) v = v.slice(1); // BOM
  // Remove zero-width + tatweel + NBSP
  v = v.replace(/[\u0640\u200B-\u200D\u2060\uFEFF\u00A0]/g, '');
  v = v.normalize('NFKC');
  return v.trim();
}

function stripBOM(text: string): string {
  if (text.length > 0 && text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/**
 * RFC-4180-ish CSV parser. Accepts `"quoted, fields"`, `""` as escaped quote,
 * CR/LF/CRLF line endings.
 */
function parseRawRows(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse + validate a CSV buffer. Returns all rows + all errors found. Caller
 * decides whether to abort on errors.length > 0 or proceed with valid rows only.
 */
export function parseCatalogCsv(text: string): CsvParseResult {
  const stripped = stripBOM(text);
  const rawRows = parseRawRows(stripped).filter((r) =>
    r.some((c) => c.trim().length > 0),
  );
  if (rawRows.length === 0) {
    return {
      rows: [],
      errors: [
        {
          kind: 'empty_file',
          message:
            'CSV has no rows. Check the file was exported as UTF-8 and not empty.',
        },
      ],
      warnings: [],
    };
  }

  const header = rawRows[0].map((h) => normalizeCell(h).toLowerCase());
  const missing: string[] = [];
  for (const col of REQUIRED_HEADERS) {
    if (!header.includes(col)) missing.push(col);
  }
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          kind: 'missing_header',
          message: `Required column(s) missing from CSV header: ${missing.join(', ')}. Got: ${header.join(', ')}`,
        },
      ],
      warnings: [],
    };
  }

  const errors: CsvParseError[] = [];
  const warnings: CsvParseError[] = [];
  const seenSkus = new Map<string, number>(); // sku -> first-seen row index

  const rows: CsvRow[] = [];
  for (let r = 1; r < rawRows.length; r += 1) {
    const cells = rawRows[r];
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = normalizeCell(cells[idx] ?? '');
    });

    const row = obj as unknown as CsvRow;
    const rowNum = r + 1; // human-friendly (header at row 1)

    if (!row.sku) {
      errors.push({
        kind: 'row_missing_sku',
        row: rowNum,
        message: `Row ${rowNum}: sku is required.`,
      });
      continue;
    }

    const prev = seenSkus.get(row.sku);
    if (prev != null) {
      errors.push({
        kind: 'duplicate_sku',
        row: rowNum,
        value: row.sku,
        message: `Row ${rowNum}: duplicate SKU "${row.sku}" (first seen at row ${prev}).`,
      });
      continue;
    }
    seenSkus.set(row.sku, rowNum);

    if (!row.name_en) {
      errors.push({
        kind: 'row_missing_name_en',
        row: rowNum,
        column: 'name_en',
        message: `Row ${rowNum}: name_en is required.`,
      });
      continue;
    }

    if (
      row.name_en.length > MAX_NAME_CHARS ||
      row.name_ar.length > MAX_NAME_CHARS
    ) {
      warnings.push({
        kind: 'name_too_long',
        row: rowNum,
        message: `Row ${rowNum}: name exceeds ${MAX_NAME_CHARS} chars — may truncate in catalog UI.`,
      });
    }

    const price = Number.parseFloat(row.base_price_egp);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        kind: 'invalid_price',
        row: rowNum,
        column: 'base_price_egp',
        value: row.base_price_egp,
        message: `Row ${rowNum}: invalid base_price_egp "${row.base_price_egp}" — must be a non-negative number.`,
      });
      continue;
    }

    if (
      row.authenticity &&
      !['GENUINE', 'COMPATIBLE', ''].includes(row.authenticity.toUpperCase())
    ) {
      warnings.push({
        kind: 'invalid_authenticity',
        row: rowNum,
        column: 'authenticity',
        value: row.authenticity,
        message: `Row ${rowNum}: unknown authenticity "${row.authenticity}" — defaulting to GENUINE.`,
      });
    }

    if (
      row.status &&
      !['ACTIVE', 'ARCHIVED', ''].includes(row.status.toUpperCase())
    ) {
      warnings.push({
        kind: 'invalid_status',
        row: rowNum,
        column: 'status',
        value: row.status,
        message: `Row ${rowNum}: unknown status "${row.status}" — defaulting to ACTIVE.`,
      });
    }

    if (row.specs_json) {
      try {
        const parsed = JSON.parse(row.specs_json);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.push({
            kind: 'invalid_specs_json',
            row: rowNum,
            column: 'specs_json',
            message: `Row ${rowNum}: specs_json must be a JSON object, got ${typeof parsed}.`,
          });
          continue;
        }
      } catch {
        errors.push({
          kind: 'invalid_specs_json',
          row: rowNum,
          column: 'specs_json',
          message: `Row ${rowNum}: specs_json is not valid JSON.`,
        });
        continue;
      }
    }

    rows.push(row);
  }

  return { rows, errors, warnings };
}
