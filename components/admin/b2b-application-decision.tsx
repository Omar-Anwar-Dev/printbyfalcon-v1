'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  approveB2BApplicationAction,
  rejectB2BApplicationAction,
} from '@/app/actions/admin-b2b';
import { Button } from '@/components/ui/button';

type Labels = {
  approve: string;
  reject: string;
  approveTitle: string;
  rejectTitle: string;
  tier: string;
  tierAOption: string;
  tierBOption: string;
  tierCOption: string;
  creditTerms: string;
  creditTermsNone: string;
  creditTermsNet15: string;
  creditTermsNet30: string;
  creditTermsCustom: string;
  creditLimit: string;
  creditLimitHelp: string;
  note: string;
  notePlaceholder: string;
  reason: string;
  reasonPlaceholder: string;
  confirm: string;
  cancel: string;
  confirmingApprove: string;
  confirmingReject: string;
};

type Props = {
  applicationId: string;
  labels: Labels;
};

type Mode = null | 'approve' | 'reject';

export function B2BApplicationDecision({ applicationId, labels }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [creditTerms, setCreditTerms] = useState<
    'NONE' | 'NET_15' | 'NET_30' | 'CUSTOM'
  >('NONE');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setMode(null);
    setError(null);
  }

  async function submitApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('applicationId', applicationId);
    start(async () => {
      const res = await approveB2BApplicationAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      close();
      router.refresh();
    });
  }

  async function submitReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('applicationId', applicationId);
    start(async () => {
      const res = await rejectB2BApplicationAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setMode('approve')}
          className="bg-success text-white hover:bg-success"
        >
          {labels.approve}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setMode('reject')}
          className="border-error/30 text-error hover:bg-error-soft"
        >
          {labels.reject}
        </Button>
      </div>

      {mode === 'approve' ? (
        <Modal title={labels.approveTitle} onClose={close}>
          <form onSubmit={submitApprove} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor={`tier-${applicationId}`}
                className="text-sm font-medium"
              >
                {labels.tier}
              </label>
              <select
                id={`tier-${applicationId}`}
                name="pricingTierCode"
                required
                defaultValue="A"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="A">{labels.tierAOption}</option>
                <option value="B">{labels.tierBOption}</option>
                <option value="C">{labels.tierCOption}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`terms-${applicationId}`}
                className="text-sm font-medium"
              >
                {labels.creditTerms}
              </label>
              <select
                id={`terms-${applicationId}`}
                name="creditTerms"
                required
                value={creditTerms}
                onChange={(e) =>
                  setCreditTerms(e.target.value as typeof creditTerms)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="NONE">{labels.creditTermsNone}</option>
                <option value="NET_15">{labels.creditTermsNet15}</option>
                <option value="NET_30">{labels.creditTermsNet30}</option>
                <option value="CUSTOM">{labels.creditTermsCustom}</option>
              </select>
            </div>

            {creditTerms === 'CUSTOM' ? (
              <div className="space-y-2">
                <label
                  htmlFor={`limit-${applicationId}`}
                  className="text-sm font-medium"
                >
                  {labels.creditLimit}
                </label>
                <input
                  id={`limit-${applicationId}`}
                  name="creditLimitEgp"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {labels.creditLimitHelp}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor={`note-${applicationId}`}
                className="text-sm font-medium"
              >
                {labels.note}
              </label>
              <textarea
                id={`note-${applicationId}`}
                name="note"
                rows={3}
                maxLength={500}
                placeholder={labels.notePlaceholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={pending}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-success text-white hover:bg-success"
              >
                {pending ? labels.confirmingApprove : labels.confirm}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {mode === 'reject' ? (
        <Modal title={labels.rejectTitle} onClose={close}>
          <form onSubmit={submitReject} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor={`reason-${applicationId}`}
                className="text-sm font-medium"
              >
                {labels.reason}
              </label>
              <textarea
                id={`reason-${applicationId}`}
                name="reason"
                rows={4}
                required
                minLength={10}
                maxLength={500}
                placeholder={labels.reasonPlaceholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={pending}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-error text-white hover:bg-error"
              >
                {pending ? labels.confirmingReject : labels.confirm}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
