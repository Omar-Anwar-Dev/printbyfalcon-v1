'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inviteAdminAction } from '@/app/actions/admin-users';

const ROLE_OPTIONS_AR = [
  { value: 'OWNER', label: 'مالك (Owner) — صلاحية كاملة' },
  { value: 'OPS', label: 'عمليات (Ops) — الطلبات والمخزون' },
  { value: 'SALES_REP', label: 'مبيعات (Sales Rep) — طلبات B2B' },
];
const ROLE_OPTIONS_EN = [
  { value: 'OWNER', label: 'Owner — full access' },
  { value: 'OPS', label: 'Ops — orders & inventory' },
  { value: 'SALES_REP', label: 'Sales Rep — B2B queues' },
];

export function AdminInviteForm({ isAr }: { isAr: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = isAr ? ROLE_OPTIONS_AR : ROLE_OPTIONS_EN;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await inviteAdminAction(fd);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      router.push('/admin/users');
      router.refresh();
    });
  }

  return (
    <form className="max-w-lg space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <Input
          type="email"
          name="email"
          required
          autoComplete="off"
          placeholder="name@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'الدور' : 'Role'}
        </label>
        <select
          name="role"
          required
          defaultValue="OPS"
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
          {error === 'admin.invite.email_taken'
            ? isAr
              ? 'هذا البريد مستخدم بالفعل.'
              : 'This email already has an account.'
            : error === 'validation.invalid'
              ? isAr
                ? 'بيانات غير صحيحة — راجع البريد والدور.'
                : 'Invalid input — check email and role.'
              : error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isAr
              ? 'جار الإرسال...'
              : 'Sending...'
            : isAr
              ? 'إرسال الدعوة'
              : 'Send invitation'}
        </Button>
      </div>
    </form>
  );
}
