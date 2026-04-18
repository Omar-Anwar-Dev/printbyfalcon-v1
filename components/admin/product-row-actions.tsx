'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveProductAction,
  deleteProductAction,
  unarchiveProductAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';

type Labels = {
  archive: string;
  unarchive: string;
  delete: string;
  confirmArchive: string;
  confirmDelete: string;
};

export function ProductRowActions({
  id,
  status,
  labels,
}: {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED';
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleArchive = () => {
    if (!confirm(labels.confirmArchive)) return;
    start(async () => {
      const res =
        status === 'ACTIVE'
          ? await archiveProductAction(id)
          : await unarchiveProductAction(id);
      if (!res.ok) alert(res.errorKey);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(labels.confirmDelete)) return;
    start(async () => {
      const res = await deleteProductAction(id);
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
        disabled={pending}
      >
        {labels.delete}
      </Button>
    </div>
  );
}
