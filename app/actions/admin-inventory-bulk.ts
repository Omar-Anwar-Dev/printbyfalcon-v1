'use server';

/**
 * Bulk-receive via CSV paste (Sprint 6 S6-D8-T1). Parses a minimal 2- or
 * 3-column CSV (`sku,qty[,note]`), resolves SKU → productId, and calls the
 * per-row `receiveStockAction` path so every row gets the same audit +
 * InventoryMovement trail as a manual Receive. Partial failures don't abort
 * — the response lists successes and failures row-by-row.
 */
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { receiveStockAction } from './admin-inventory';

type RowResult = {
  line: number;
  sku: string;
  ok: boolean;
  message: string;
};

export async function bulkReceiveAction(input: { csv: string }): Promise<{
  ok: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  rows: RowResult[];
}> {
  await requireAdmin(['OWNER', 'OPS']);
  const rows = parseRows(input.csv);
  const results: RowResult[] = [];

  // Resolve SKU → productId in one round-trip.
  const skus = Array.from(
    new Set(rows.map((r) => r.sku).filter((s) => s.length > 0)),
  );
  const products = skus.length
    ? await prisma.product.findMany({
        where: { sku: { in: skus } },
        select: { id: true, sku: true },
      })
    : [];
  const skuMap = new Map(products.map((p) => [p.sku, p.id]));

  for (const row of rows) {
    if (!row.sku) {
      results.push({
        line: row.line,
        sku: '',
        ok: false,
        message: 'missing_sku',
      });
      continue;
    }
    const productId = skuMap.get(row.sku);
    if (!productId) {
      results.push({
        line: row.line,
        sku: row.sku,
        ok: false,
        message: 'sku_not_found',
      });
      continue;
    }
    if (!Number.isFinite(row.qty) || row.qty <= 0) {
      results.push({
        line: row.line,
        sku: row.sku,
        ok: false,
        message: 'invalid_qty',
      });
      continue;
    }
    const res = await receiveStockAction({
      productId,
      qty: row.qty,
      reason: row.note ? `bulk-import: ${row.note}` : 'bulk-import',
    });
    if (res.ok) {
      results.push({
        line: row.line,
        sku: row.sku,
        ok: true,
        message: `new_qty=${res.data.newQty}`,
      });
    } else {
      results.push({
        line: row.line,
        sku: row.sku,
        ok: false,
        message: res.errorKey,
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return {
    ok: true,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    rows: results,
  };
}

type ParsedRow = {
  line: number;
  sku: string;
  qty: number;
  note: string | null;
};

function parseRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/);
  const out: ParsedRow[] = [];
  let lineNo = 0;
  for (const raw of lines) {
    lineNo += 1;
    const line = raw.trim();
    if (!line) continue;
    // skip header row if present
    if (lineNo === 1 && /^sku\s*,/i.test(line)) continue;
    const parts = splitCsvLine(line);
    const sku = (parts[0] ?? '').trim();
    const qty = Number.parseInt((parts[1] ?? '').trim(), 10);
    const note = (parts[2] ?? '').trim() || null;
    out.push({ line: lineNo, sku, qty, note });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
