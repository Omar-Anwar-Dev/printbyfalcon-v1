'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pencil, Trash2, Star, Plus, Check, X } from 'lucide-react';
import {
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
  type AddressInput,
} from '@/app/actions/addresses';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Address = {
  id: string;
  recipientName: string;
  phone: string;
  governorate: string;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  notes: string | null;
  isDefault: boolean;
};

type Props = {
  locale: 'ar' | 'en';
  addresses: Address[];
};

const GOVS = [
  'CAIRO',
  'GIZA',
  'QALYUBIA',
  'ALEXANDRIA',
  'BEHEIRA',
  'DAKAHLIA',
  'DAMIETTA',
  'GHARBIA',
  'KAFR_EL_SHEIKH',
  'MENOUFIA',
  'SHARQIA',
  'ISMAILIA',
  'PORT_SAID',
  'SUEZ',
  'NORTH_SINAI',
  'SOUTH_SINAI',
  'RED_SEA',
  'MATRUH',
  'NEW_VALLEY',
  'BENI_SUEF',
  'FAYOUM',
  'MINYA',
  'ASYUT',
  'SOHAG',
  'QENA',
  'LUXOR',
  'ASWAN',
];

const LABELS = {
  ar: {
    addBtn: 'إضافة عنوان',
    empty: 'لم تضف عنوانًا بعد.',
    default: 'افتراضي',
    edit: 'تعديل',
    delete: 'حذف',
    makeDefault: 'جعله افتراضي',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirmDeleteTitle: 'حذف هذا العنوان؟',
    confirmDeleteBody:
      'هذا العنوان سيُحذف نهائياً من حسابك. الطلبات السابقة بتحتفظ بنسخة من العنوان فلن تتأثر.',
    confirmDeleteCta: 'نعم، احذف',
    recipient: 'اسم المستلم',
    phone: 'الموبايل',
    phoneHelp: 'مثال: 01113334444 أو +201113334444',
    gov: 'المحافظة',
    city: 'المدينة',
    area: 'المنطقة / الحي',
    street: 'الشارع',
    building: 'العمارة',
    apartment: 'الشقة',
    notes: 'ملاحظات',
    isDefault: 'اجعله عنواني الافتراضي',
    limit: 'الحد الأقصى 5 عناوين.',
    errors: {
      'auth.not_signed_in':
        'انتهت صلاحية جلستك. سجّل الدخول من جديد عشان تكمل.',
      'validation.invalid':
        'فيه حقل ناقص أو غير صحيح. تأكد من رقم الموبايل (يبدأ بـ 01 وعدد أرقامه 11) والاسم والعنوان.',
      'address.limit_reached':
        'وصلت للحد الأقصى (5 عناوين). امسح عنوان قديم عشان تضيف واحد جديد.',
      'address.not_found':
        'العنوان مش موجود — يمكن يكون اتمسح من جلسة أخرى. حدّث الصفحة وحاول تاني.',
      generic: 'حصل خطأ أثناء الحفظ. حاول تاني.',
    },
  },
  en: {
    addBtn: 'Add address',
    empty: 'No addresses yet.',
    default: 'Default',
    edit: 'Edit',
    delete: 'Delete',
    makeDefault: 'Make default',
    save: 'Save',
    cancel: 'Cancel',
    confirmDeleteTitle: 'Delete this address?',
    confirmDeleteBody:
      "This address will be removed from your account. Past orders keep their own snapshot, so they're unaffected.",
    confirmDeleteCta: 'Yes, delete',
    recipient: 'Recipient',
    phone: 'Phone',
    phoneHelp: 'e.g., 01113334444 or +201113334444',
    gov: 'Governorate',
    city: 'City',
    area: 'Area',
    street: 'Street',
    building: 'Building',
    apartment: 'Apartment',
    notes: 'Notes',
    isDefault: 'Set as my default address',
    limit: 'Max 5 addresses.',
    errors: {
      'auth.not_signed_in':
        'Your session has expired. Please sign in again to continue.',
      'validation.invalid':
        'Some fields are missing or invalid. Check the phone number (11 digits starting with 01) plus the name and address.',
      'address.limit_reached':
        "You've hit the 5-address limit. Delete an old one to add a new address.",
      'address.not_found':
        'That address is no longer there — it may have been deleted in another session. Refresh the page and try again.',
      generic: 'Something went wrong saving the address. Please try again.',
    },
  },
};

const EMPTY: AddressInput = {
  recipientName: '',
  phone: '',
  governorate: 'CAIRO' as AddressInput['governorate'],
  city: '',
  area: '',
  street: '',
  building: '',
  apartment: '',
  notes: '',
  isDefault: false,
};

export function AddressManager({ locale, addresses }: Props) {
  const labels = LABELS[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function startAdd() {
    setForm(EMPTY);
    setAdding(true);
    setEditingId(null);
    setErrorMsg(null);
  }

  function startEdit(a: Address) {
    setForm({
      recipientName: a.recipientName,
      phone: a.phone,
      governorate: a.governorate as AddressInput['governorate'],
      city: a.city,
      area: a.area ?? '',
      street: a.street,
      building: a.building ?? '',
      apartment: a.apartment ?? '',
      notes: a.notes ?? '',
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setAdding(false);
    setErrorMsg(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setErrorMsg(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = editingId
        ? await updateAddressAction(editingId, form)
        : await addAddressAction(form);
      if (!res.ok) {
        const key = res.errorKey as keyof typeof labels.errors;
        setErrorMsg(labels.errors[key] ?? labels.errors.generic);
        return;
      }
      cancel();
      router.refresh();
    });
  }

  function del(id: string) {
    setDeleteCandidate(id);
  }

  function confirmDel() {
    if (!deleteCandidate) return;
    const id = deleteCandidate;
    startTransition(async () => {
      await deleteAddressAction(id);
      setDeleteCandidate(null);
      router.refresh();
    });
  }

  function makeDefault(id: string) {
    startTransition(async () => {
      await setDefaultAddressAction(id);
      router.refresh();
    });
  }

  const showForm = adding || editingId !== null;
  const atLimit = addresses.length >= 5 && !showForm;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={startAdd}
          disabled={atLimit}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          {labels.addBtn}
        </button>
        {atLimit ? (
          <span className="text-xs text-muted-foreground">{labels.limit}</span>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-md border bg-muted/20 p-4 text-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span>{labels.recipient}</span>
              <input
                required
                value={form.recipientName}
                onChange={(e) =>
                  setForm({ ...form, recipientName: e.target.value })
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span>{labels.phone}</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01113334444"
                className="num w-full rounded-md border bg-background px-3 py-2 text-start"
              />
              <span className="block text-xs text-muted-foreground">
                {labels.phoneHelp}
              </span>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span>{labels.gov}</span>
              <select
                required
                value={form.governorate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    governorate: e.target.value as AddressInput['governorate'],
                  })
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {GOVS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span>{labels.city}</span>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span>{labels.area}</span>
              <input
                value={form.area ?? ''}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span>{labels.street}</span>
              <input
                required
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span>{labels.building}</span>
              <input
                value={form.building ?? ''}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span>{labels.apartment}</span>
              <input
                value={form.apartment ?? ''}
                onChange={(e) =>
                  setForm({ ...form, apartment: e.target.value })
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span>{labels.notes}</span>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
            />
            <span>{labels.isDefault}</span>
          </label>
          {errorMsg ? (
            <p
              role="alert"
              className="rounded-md border border-error/30 bg-error-soft px-3 py-2 text-sm text-error"
            >
              {errorMsg}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
              {labels.save}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              {labels.cancel}
            </button>
          </div>
        </form>
      ) : null}

      {addresses.length === 0 ? (
        <p className="rounded-md border border-border bg-paper p-6 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border bg-background p-4 text-sm shadow-card"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {a.recipientName}
                    </span>
                    {a.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">
                        <Star className="h-3 w-3" strokeWidth={2} aria-hidden />
                        {labels.default}
                      </span>
                    ) : null}
                  </div>
                  <p className="num font-mono text-muted-foreground">
                    {a.phone}
                  </p>
                  <p className="text-foreground">
                    {a.street}
                    {a.building ? `, ${a.building}` : ''}
                    {a.apartment ? `, ${a.apartment}` : ''}
                  </p>
                  <p className="text-muted-foreground">
                    {a.city}
                    {a.area ? ` — ${a.area}` : ''} — {a.governorate}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-paper-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {labels.edit}
                </button>
                {!a.isDefault ? (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-accent-strong transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {labels.makeDefault}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => del(a.id)}
                  disabled={pending}
                  className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-error/30 bg-background px-3 text-xs font-medium text-error transition-colors hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {labels.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(o) => (o ? null : setDeleteCandidate(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.confirmDeleteTitle}</DialogTitle>
            <DialogDescription>{labels.confirmDeleteBody}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDel}
              disabled={pending}
            >
              {labels.confirmDeleteCta}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
