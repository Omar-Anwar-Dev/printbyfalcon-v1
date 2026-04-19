'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { bulkArchiveProductsAction } from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';

type Props = {
  confirmLabel: string;
  bulkArchiveLabel: string;
  noneSelectedLabel: string;
};

/**
 * Client-side partner for the admin-products bulk-archive form.
 * Rendered above the product table; the table's checkboxes each carry
 * `form="admin-bulk-archive-form"` so they submit into the hidden
 * form below regardless of their physical position in the DOM.
 *
 * Submits through `bulkArchiveProductsAction` on the server.
 * Shows a running count of selected rows by listening to checkbox changes.
 */
export function BulkArchiveBar({
  confirmLabel,
  bulkArchiveLabel,
  noneSelectedLabel,
}: Props) {
  const router = useRouter();
  const [selectedCount, setSelectedCount] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function recount() {
      const checked = document.querySelectorAll<HTMLInputElement>(
        'input[form="admin-bulk-archive-form"][name="ids"]:checked',
      );
      setSelectedCount(checked.length);
    }
    document.addEventListener('change', recount);
    recount();
    return () => document.removeEventListener('change', recount);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedCount === 0) return;
    if (!confirm(confirmLabel)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await bulkArchiveProductsAction(fd);
      if (!res.ok) {
        alert(res.errorKey);
        return;
      }
      // Clear selection and refresh the table.
      document
        .querySelectorAll<HTMLInputElement>(
          'input[form="admin-bulk-archive-form"][name="ids"]:checked',
        )
        .forEach((el) => {
          el.checked = false;
        });
      setSelectedCount(0);
      router.refresh();
    });
  }

  return (
    <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
      <form
        id="admin-bulk-archive-form"
        onSubmit={onSubmit}
        className="flex items-center gap-3"
      >
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={pending || selectedCount === 0}
        >
          {bulkArchiveLabel}
        </Button>
        <span className="text-muted-foreground">
          {selectedCount > 0 ? `${selectedCount}` : noneSelectedLabel}
        </span>
      </form>
    </div>
  );
}
