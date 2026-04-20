'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteCourierAction,
  toggleCourierActiveAction,
} from '@/app/actions/admin-couriers';
import { Button } from '@/components/ui/button';

type Labels = {
  activate: string;
  deactivate: string;
  delete: string;
  confirmDelete: string;
  hasDependentsHelp: string;
};

export function CourierRowActions({
  id,
  active,
  hasDependents,
  labels,
}: {
  id: string;
  active: boolean;
  hasDependents: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleToggle = () => {
    start(async () => {
      const res = await toggleCourierActiveAction(id);
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
      const res = await deleteCourierAction(id);
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
        onClick={handleToggle}
        disabled={pending}
      >
        {active ? labels.deactivate : labels.activate}
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
