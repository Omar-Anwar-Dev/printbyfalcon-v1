import { describe, it, expect } from 'vitest';
import { parseCatalogCsv } from './csv-parser';

const HEADER =
  'sku,name_ar,name_en,description_ar,description_en,brand_slug,category_slug,base_price_egp,vat_exempt,authenticity,specs_json,status';

function row(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    sku: 'SKU-001',
    name_ar: 'منتج',
    name_en: 'Product',
    description_ar: '',
    description_en: '',
    brand_slug: 'hp',
    category_slug: 'toner',
    base_price_egp: '100',
    vat_exempt: 'false',
    authenticity: 'GENUINE',
    specs_json: '',
    status: 'ACTIVE',
    ...overrides,
  };
  const order = [
    'sku',
    'name_ar',
    'name_en',
    'description_ar',
    'description_en',
    'brand_slug',
    'category_slug',
    'base_price_egp',
    'vat_exempt',
    'authenticity',
    'specs_json',
    'status',
  ];
  return order.map((k) => defaults[k] ?? '').join(',');
}

describe('parseCatalogCsv', () => {
  it('parses a minimal valid CSV', () => {
    const csv = `${HEADER}\n${row()}`;
    const res = parseCatalogCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].sku).toBe('SKU-001');
    expect(res.rows[0].name_en).toBe('Product');
  });

  it('strips UTF-8 BOM from Excel exports', () => {
    const csv = `\ufeff${HEADER}\n${row()}`;
    const res = parseCatalogCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
  });

  it('fails fast when a required header is missing', () => {
    const csv = `name_ar,name_en,base_price_egp\nfoo,bar,100`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].kind).toBe('missing_header');
    expect(res.errors[0].message).toContain('sku');
  });

  it('fails on a totally empty file', () => {
    const res = parseCatalogCsv('');
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].kind).toBe('empty_file');
  });

  it('flags duplicate SKUs within the same CSV', () => {
    const csv = `${HEADER}\n${row({ sku: 'DUP-1' })}\n${row({ sku: 'DUP-1', name_en: 'Different' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(1); // first wins
    expect(res.errors.some((e) => e.kind === 'duplicate_sku')).toBe(true);
  });

  it('flags rows with missing SKU or name_en', () => {
    const csv = `${HEADER}\n${row({ sku: '' })}\n${row({ sku: 'SKU-2', name_en: '' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.errors.some((e) => e.kind === 'row_missing_sku')).toBe(true);
    expect(res.errors.some((e) => e.kind === 'row_missing_name_en')).toBe(true);
  });

  it('flags invalid base_price values', () => {
    const csv = `${HEADER}\n${row({ sku: 'BAD-PRICE', base_price_egp: 'abc' })}\n${row({ sku: 'NEG-PRICE', base_price_egp: '-5' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.errors.filter((e) => e.kind === 'invalid_price')).toHaveLength(
      2,
    );
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    const csv = `${HEADER}\nFANCY-001,"ابن ""المدير""","Product, Ltd.",,,,,100,false,GENUINE,,ACTIVE`;
    const res = parseCatalogCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].name_ar).toBe('ابن "المدير"');
    expect(res.rows[0].name_en).toBe('Product, Ltd.');
  });

  it('handles CRLF line endings', () => {
    const csv = `${HEADER}\r\n${row()}\r\n`;
    const res = parseCatalogCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
  });

  it('normalises tatweel and zero-width chars in Arabic names', () => {
    // tatweel (U+0640), zero-width joiner (U+200D)
    const csv = `${HEADER}\n${row({ sku: 'AR-1', name_ar: 'طـابـ\u200Dعة' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].name_ar).toBe('طابعة');
  });

  it('treats non-breaking space as regular whitespace', () => {
    const csv = `${HEADER}\n${row({ sku: '  \u00a0SKU-3\u00a0  ' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].sku).toBe('SKU-3');
  });

  it('warns (does not fail) on unknown authenticity / status', () => {
    const csv = `${HEADER}\n${row({ sku: 'W-1', authenticity: 'UNKNOWN' })}\n${row({ sku: 'W-2', status: 'DRAFT' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(2);
    expect(res.warnings.some((w) => w.kind === 'invalid_authenticity')).toBe(
      true,
    );
    expect(res.warnings.some((w) => w.kind === 'invalid_status')).toBe(true);
  });

  it('fails rows with invalid specs_json', () => {
    const csv = `${HEADER}\n${row({ sku: 'JSON-1', specs_json: '{invalid}' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].kind).toBe('invalid_specs_json');
  });

  it('fails rows where specs_json is a valid JSON but not an object', () => {
    const csv = `${HEADER}\n${row({ sku: 'JSON-2', specs_json: '[1,2,3]' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].kind).toBe('invalid_specs_json');
  });

  it('warns when product name exceeds 200 chars but still imports the row', () => {
    const longName = 'x'.repeat(201);
    const csv = `${HEADER}\n${row({ sku: 'LONG-1', name_en: longName })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.warnings.some((w) => w.kind === 'name_too_long')).toBe(true);
  });

  it('returns partial results — keeps valid rows when other rows are bad', () => {
    const csv = `${HEADER}\n${row({ sku: 'GOOD-1' })}\n${row({ sku: '', name_en: 'orphan' })}\n${row({ sku: 'GOOD-2' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(2);
    expect(res.rows.map((r) => r.sku)).toEqual(['GOOD-1', 'GOOD-2']);
    expect(res.errors).toHaveLength(1);
  });

  it('skips blank lines without error', () => {
    const csv = `${HEADER}\n${row()}\n\n\n${row({ sku: 'SKU-B' })}`;
    const res = parseCatalogCsv(csv);
    expect(res.rows).toHaveLength(2);
    expect(res.errors).toEqual([]);
  });
});
