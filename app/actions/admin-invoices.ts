'use server';

/**
 * Admin actions for invoice amendment (Sprint 6 S6-D5-T3). Gated on OWNER+OPS
 * per ADR-016 — accounting corrections shouldn't be a sales-rep scope.
 * Amendment creates a new Invoice version, preserves the prior as
 * `isAmended=true`, and re-sends the new PDF to the customer.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { amendInvoice } from '@/lib/invoices/ensure';
import { sendInvoiceToCustomer } from '@/lib/invoices/delivery';
import { toLocalizedIssues } from '@/lib/validation/error-map';

const schema = z.object({
  invoiceId: z.string().cuid(),
  reason: z.string().trim().min(3).max(500),
  redeliver: z.boolean().default(true),
});

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: { path: (string | number)[]; key: string }[];
};
type ActionResult<T> = ActionOk<T> | ActionErr;

export async function amendInvoiceAction(input: {
  invoiceId: string;
  reason: string;
  redeliver?: boolean;
}): Promise<
  ActionResult<{ invoiceId: string; invoiceNumber: string; version: number }>
> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  try {
    const result = await amendInvoice(
      parsed.data.invoiceId,
      parsed.data.reason,
      actor.id,
    );
    if (parsed.data.redeliver) {
      await sendInvoiceToCustomer(result.invoiceId);
    }
    revalidatePath('/admin/orders', 'page');
    revalidatePath('/account/orders', 'page');
    return { ok: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'invoice.not_found') {
      return { ok: false, errorKey: 'invoice.not_found' };
    }
    throw err;
  }
}
