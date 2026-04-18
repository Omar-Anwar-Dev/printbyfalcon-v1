'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archivePrinterModelAction,
  deletePrinterModelAction,
  unarchivePrinterModelAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';

type Labels = {
  archive: string;
  unarchive: string;
  delete: string;
  confirmArchive: string;
  confirmDelete: string;
  hasDependentsHelp: string;
};

export function PrinterModelRowActions({
  id,
  status,
  hasDependents,
  labels,
}: {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED';
  hasDependents: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleArchive = () => {
    if (!confirm(labels.confirmArchive)) return;
    start(async () => {
      const res =
        status === 'ACTIVE'
          ? await archivePrinterModelAction(id)
          : await unarchivePrinterModelAction(id);
      if (!res.ok) alert(res.errorKey);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (hasDependents) {
      alert(labels.hasDependentsHelp);
      return;
    }
    if (!confirm(labels.confirmDelete)) return;
    start(async () => {
      const res = await deletePrinterModelAction(id);
      if (!res.ok) alert(res.errorKey);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleArchive}
        disabled={pending}
      >
        {status === 'ACTIVE' ? labels.archive : labels.unarchive}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={pending || hasDependents}
        title={hasDependents ? labels.hasDependentsHelp : undefined}
      >
        {labels.delete}
      </Button>
    </div>
  );
}
