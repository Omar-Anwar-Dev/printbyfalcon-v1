'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
  type AddressInput,
} from '@/app/actions/addresses';

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
    addBtn: '+ إضافة عنوان',
    empty: 'لم تضف عنوانًا بعد.',
    default: 'افتراضي',
    edit: 'تعديل',
    delete: 'حذف',
    makeDefault: 'جعله افتراضي',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirmDelete: 'حذف هذا العنوان؟',
    recipient: 'اسم المستلم',
    phone: 'الموبايل',
    gov: 'المحافظة',
    city: 'المدينة',
    area: 'المنطقة / الحي',
    street: 'الشارع',
    building: 'العمارة',
    apartment: 'الشقة',
    notes: 'ملاحظات',
    isDefault: 'اجعله عنواني الافتراضي',
    limit: 'الحد الأقصى 5 عناوين.',
  },
  en: {
    addBtn: '+ Add address',
    empty: 'No addresses yet.',
    default: 'Default',
    edit: 'Edit',
    delete: 'Delete',
    makeDefault: 'Make default',
    save: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Delete this address?',
    recipient: 'Recipient',
    phone: 'Phone',
    gov: 'Governorate',
    city: 'City',
    area: 'Area',
    street: 'Street',
    building: 'Building',
    apartment: 'Apartment',
    notes: 'Notes',
    isDefault: 'Set as my default address',
    limit: 'Max 5 addresses.',
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

  function startAdd() {
    setForm(EMPTY);
    setAdding(true);
    setEditingId(null);
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
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = editingId
        ? await updateAddressAction(editingId, form)
        : await addAddressAction(form);
      if (!res.ok) {
        alert(res.errorKey);
        return;
      }
      cancel();
      router.refresh();
    });
  }

  function del(id: string) {
    if (!confirm(labels.confirmDelete)) return;
    startTransition(async () => {
      await deleteAddressAction(id);
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
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={startAdd}
          disabled={atLimit}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
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
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {labels.save}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      ) : null}

      {addresses.length === 0 ? (
        <p className="rounded-md border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex justify-between gap-3 rounded-md border bg-background p-4 text-sm"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium">{a.recipientName}</span>
                  {a.isDefault ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {labels.default}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground">{a.phone}</p>
                <p>
                  {a.street}
                  {a.building ? `, ${a.building}` : ''}
                  {a.apartment ? `, ${a.apartment}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {a.city}
                  {a.area ? ` — ${a.area}` : ''} — {a.governorate}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="text-xs text-primary hover:underline"
                >
                  {labels.edit}
                </button>
                {!a.isDefault ? (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    {labels.makeDefault}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => del(a.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  {labels.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
