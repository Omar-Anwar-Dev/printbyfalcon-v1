'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateCompanyTermsAction } from '@/app/actions/admin-b2b';
import { Button } from '@/components/ui/button';

type Props = {
  companyId: string;
  initial: {
    pricingTierCode: 'A' | 'B' | 'C';
    creditTerms: 'NONE' | 'NET_15' | 'NET_30' | 'CUSTOM';
    creditLimitEgp: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
    checkoutPolicy: 'BOTH' | 'SUBMIT_FOR_REVIEW_ONLY' | 'PAY_NOW_ONLY';
  };
  locale: 'ar' | 'en';
};

export function CompanyTermsForm({ companyId, initial, locale }: Props) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [terms, setTerms] = useState(initial.creditTerms);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('companyId', companyId);
    start(async () => {
      const res = await updateCompanyTermsAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-md border bg-background p-4"
    >
      <h2 className="text-base font-semibold">
        {isAr ? 'الشروط التجارية' : 'Commercial terms'}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={isAr ? 'مستوى الأسعار' : 'Pricing tier'}>
          <select
            name="pricingTierCode"
            defaultValue={initial.pricingTierCode}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="A">
              {isAr ? 'المستوى أ — خصم 10٪' : 'Tier A — 10% off'}
            </option>
            <option value="B">
              {isAr ? 'المستوى ب — خصم 15٪' : 'Tier B — 15% off'}
            </option>
            <option value="C">
              {isAr ? 'المستوى ج — مخصّص' : 'Tier C — Custom'}
            </option>
          </select>
        </Field>

        <Field label={isAr ? 'حالة الحساب' : 'Account status'}>
          <select
            name="status"
            defaultValue={initial.status}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ACTIVE">{isAr ? 'نشط' : 'Active'}</option>
            <option value="SUSPENDED">{isAr ? 'موقوف' : 'Suspended'}</option>
          </select>
        </Field>

        <Field label={isAr ? 'شروط الدفع' : 'Payment terms'}>
          <select
            name="creditTerms"
            value={terms}
            onChange={(e) => setTerms(e.target.value as typeof terms)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="NONE">
              {isAr ? 'الدفع على الطلب' : 'Pay on order'}
            </option>
            <option value="NET_15">{isAr ? 'أجل 15 يوم' : 'Net 15'}</option>
            <option value="NET_30">{isAr ? 'أجل 30 يوم' : 'Net 30'}</option>
            <option value="CUSTOM">{isAr ? 'شروط خاصة' : 'Custom'}</option>
          </select>
        </Field>

        {terms === 'CUSTOM' ? (
          <Field label={isAr ? 'الحد الائتماني (ج.م)' : 'Credit limit (EGP)'}>
            <input
              type="number"
              name="creditLimitEgp"
              defaultValue={initial.creditLimitEgp ?? ''}
              min="0"
              step="1"
              dir="ltr"
              inputMode="numeric"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
        ) : null}

        <div className="md:col-span-2">
          <Field
            label={isAr ? 'خيارات الدفع عند الإتمام' : 'Checkout options shown'}
          >
            <select
              name="checkoutPolicy"
              defaultValue={initial.checkoutPolicy}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="BOTH">
                {isAr
                  ? 'الاثنان — إرسال للمراجعة + ادفع الآن'
                  : 'Both — Submit for review + Pay now'}
              </option>
              <option value="SUBMIT_FOR_REVIEW_ONLY">
                {isAr ? 'إرسال للمراجعة فقط' : 'Submit for review only'}
              </option>
              <option value="PAY_NOW_ONLY">
                {isAr ? 'ادفع الآن فقط' : 'Pay now only'}
              </option>
            </select>
          </Field>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {savedAt ? (
          <span className="text-xs text-success">
            {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? isAr
              ? 'جارٍ الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ التعديلات'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
