'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateAdminRoleAction } from '@/app/actions/admin-users';
import type { AdminRole } from '@prisma/client';

const ROLE_OPTIONS_AR = [
  { value: 'OWNER', label: 'مالك' },
  { value: 'OPS', label: 'عمليات' },
  { value: 'SALES_REP', label: 'مبيعات' },
];
const ROLE_OPTIONS_EN = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'OPS', label: 'Ops' },
  { value: 'SALES_REP', label: 'Sales Rep' },
];

export function AdminUserEditForm({
  userId,
  currentRole,
  isAr,
}: {
  userId: string;
  currentRole: AdminRole;
  isAr: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<AdminRole>(currentRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const options = isAr ? ROLE_OPTIONS_AR : ROLE_OPTIONS_EN;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('role', role);
    startTransition(async () => {
      const res = await updateAdminRoleAction(fd);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setSavedFlash(true);
      router.refresh();
      setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'الدور' : 'Role'}
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'admin.user.last_owner'
            ? isAr
              ? 'لا يمكن تخفيض آخر مالك — عيّن مالكًا آخر أولاً.'
              : 'Cannot demote the last Owner — promote another owner first.'
            : error === 'admin.user.cannot_modify_self'
              ? isAr
                ? 'لا يمكنك تعديل حسابك.'
                : 'You cannot modify your own account.'
              : error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || role === currentRole}>
          {isPending
            ? isAr
              ? 'جار الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ الدور'
              : 'Save role'}
        </Button>
        {savedFlash ? (
          <span className="text-sm text-success">
            {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
          </span>
        ) : null}
      </div>
    </form>
  );
}
