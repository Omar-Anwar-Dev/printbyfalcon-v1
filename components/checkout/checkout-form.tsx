'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createOrderAction } from '@/app/actions/checkout';

type SavedAddress = {
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
  user: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  savedAddresses: SavedAddress[];
};

const GOVERNORATES: { value: string; ar: string; en: string }[] = [
  { value: 'CAIRO', ar: 'القاهرة', en: 'Cairo' },
  { value: 'GIZA', ar: 'الجيزة', en: 'Giza' },
  { value: 'QALYUBIA', ar: 'القليوبية', en: 'Qalyubia' },
  { value: 'ALEXANDRIA', ar: 'الإسكندرية', en: 'Alexandria' },
  { value: 'BEHEIRA', ar: 'البحيرة', en: 'Beheira' },
  { value: 'DAKAHLIA', ar: 'الدقهلية', en: 'Dakahlia' },
  { value: 'DAMIETTA', ar: 'دمياط', en: 'Damietta' },
  { value: 'GHARBIA', ar: 'الغربية', en: 'Gharbia' },
  { value: 'KAFR_EL_SHEIKH', ar: 'كفر الشيخ', en: 'Kafr El-Sheikh' },
  { value: 'MENOUFIA', ar: 'المنوفية', en: 'Menoufia' },
  { value: 'SHARQIA', ar: 'الشرقية', en: 'Sharqia' },
  { value: 'ISMAILIA', ar: 'الإسماعيلية', en: 'Ismailia' },
  { value: 'PORT_SAID', ar: 'بورسعيد', en: 'Port Said' },
  { value: 'SUEZ', ar: 'السويس', en: 'Suez' },
  { value: 'NORTH_SINAI', ar: 'شمال سيناء', en: 'North Sinai' },
  { value: 'SOUTH_SINAI', ar: 'جنوب سيناء', en: 'South Sinai' },
  { value: 'RED_SEA', ar: 'البحر الأحمر', en: 'Red Sea' },
  { value: 'MATRUH', ar: 'مطروح', en: 'Matruh' },
  { value: 'NEW_VALLEY', ar: 'الوادي الجديد', en: 'New Valley' },
  { value: 'BENI_SUEF', ar: 'بني سويف', en: 'Beni Suef' },
  { value: 'FAYOUM', ar: 'الفيوم', en: 'Fayoum' },
  { value: 'MINYA', ar: 'المنيا', en: 'Minya' },
  { value: 'ASYUT', ar: 'أسيوط', en: 'Asyut' },
  { value: 'SOHAG', ar: 'سوهاج', en: 'Sohag' },
  { value: 'QENA', ar: 'قنا', en: 'Qena' },
  { value: 'LUXOR', ar: 'الأقصر', en: 'Luxor' },
  { value: 'ASWAN', ar: 'أسوان', en: 'Aswan' },
];

const LABELS = {
  ar: {
    contact: 'بيانات التواصل',
    name: 'الاسم الكامل',
    phone: 'رقم الموبايل',
    email: 'البريد الإلكتروني (اختياري)',
    shippingAddress: 'عنوان الشحن',
    savedAddresses: 'عناويني المحفوظة',
    useNewAddress: '+ استخدام عنوان جديد',
    recipient: 'اسم المستلم',
    governorate: 'المحافظة',
    city: 'المدينة',
    area: 'المنطقة / الحي',
    street: 'الشارع',
    building: 'العمارة',
    apartment: 'الشقة',
    addressNotes: 'ملاحظات للتوصيل',
    payment: 'طريقة الدفع',
    card: 'بطاقة بنكية (Paymob)',
    cod: 'الدفع عند الاستلام',
    codDescription: 'ادفع نقدًا عند استلام الطلب من المندوب.',
    cardDescription: 'هنحولك لصفحة Paymob عشان تدفع بالبطاقة بأمان.',
    notes: 'ملاحظات للطلب (اختياري)',
    submit: 'تأكيد الطلب',
    submitting: 'جارٍ المعالجة...',
    selectGov: '-- اختر المحافظة --',
    errors: {
      'cart.empty': 'سلتك فارغة',
      'cart.insufficient_stock':
        'الكمية المتاحة لأحد المنتجات أقل من المطلوب — عدّل السلة وحاول مرة أخرى.',
      'cart.item_unavailable': 'أحد المنتجات في سلتك مش متاح الآن.',
      'validation.invalid': 'من فضلك تأكد من بيانات الطلب.',
      'order.payment_setup_failed': 'حصل مشكلة في إعداد الدفع. حاول تاني.',
      generic: 'حصل خطأ. حاول مرة أخرى.',
    },
  },
  en: {
    contact: 'Contact details',
    name: 'Full name',
    phone: 'Phone number',
    email: 'Email (optional)',
    shippingAddress: 'Shipping address',
    savedAddresses: 'My saved addresses',
    useNewAddress: '+ Use a new address',
    recipient: 'Recipient name',
    governorate: 'Governorate',
    city: 'City',
    area: 'Area / District',
    street: 'Street',
    building: 'Building',
    apartment: 'Apartment',
    addressNotes: 'Delivery notes',
    payment: 'Payment method',
    card: 'Credit/Debit card (Paymob)',
    cod: 'Cash on delivery',
    codDescription: 'Pay cash when our courier delivers the order.',
    cardDescription: "We'll redirect you to Paymob to pay securely.",
    notes: 'Order notes (optional)',
    submit: 'Place order',
    submitting: 'Processing…',
    selectGov: '-- Select governorate --',
    errors: {
      'cart.empty': 'Your cart is empty.',
      'cart.insufficient_stock':
        "One of your items doesn't have enough stock — adjust quantities and retry.",
      'cart.item_unavailable': 'One of your items is no longer available.',
      'validation.invalid': 'Please check the order details.',
      'order.payment_setup_failed': 'Payment setup failed. Please try again.',
      generic: 'Something went wrong — please try again.',
    },
  },
};

export function CheckoutForm({ locale, user, savedAddresses }: Props) {
  const labels = LABELS[locale];
  const router = useRouter();
  const isAr = locale === 'ar';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Saved-address selector: null = "use new address below"
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    savedAddresses.find((a) => a.isDefault)?.id ??
      savedAddresses[0]?.id ??
      null,
  );
  const selectedAddress = selectedAddressId
    ? savedAddresses.find((a) => a.id === selectedAddressId)
    : undefined;

  const [contactName, setContactName] = useState(user?.name ?? '');
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');

  const [recipientName, setRecipientName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [governorate, setGovernorate] = useState<string>('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [apartment, setApartment] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'PAYMOB_CARD' | 'COD'>(
    'COD',
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const addressPayload = selectedAddress
      ? {
          recipientName: selectedAddress.recipientName,
          phone: selectedAddress.phone,
          governorate: selectedAddress.governorate,
          city: selectedAddress.city,
          area: selectedAddress.area ?? '',
          street: selectedAddress.street,
          building: selectedAddress.building ?? '',
          apartment: selectedAddress.apartment ?? '',
          notes: selectedAddress.notes ?? '',
        }
      : {
          recipientName,
          phone: addrPhone,
          governorate,
          city,
          area,
          street,
          building,
          apartment,
          notes: addressNotes,
        };

    startTransition(async () => {
      const res = await createOrderAction({
        contact: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
        },
        address: addressPayload as Parameters<
          typeof createOrderAction
        >[0]['address'],
        paymentMethod,
        customerNotes,
      });
      if (!res.ok) {
        const key = res.errorKey as keyof typeof labels.errors;
        setError(labels.errors[key] ?? labels.errors.generic);
        return;
      }
      // Paymob card flow → redirect outbound; COD / dev-stub → internal route.
      const target = res.data.redirectUrl;
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        router.push(target);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">{labels.contact}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>{labels.name}</span>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{labels.phone}</span>
            <input
              required
              type="tel"
              inputMode="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>{labels.email}</span>
            <input
              type="email"
              value={contactEmail ?? ''}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">{labels.shippingAddress}</h2>

        {savedAddresses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{labels.savedAddresses}</p>
            <ul className="space-y-2">
              {savedAddresses.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
                    <input
                      type="radio"
                      name="savedAddress"
                      className="mt-1"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <span>
                      <span className="font-medium">{a.recipientName}</span>
                      <span className="block text-muted-foreground">
                        {a.phone}
                      </span>
                      <span className="block">
                        {a.street}
                        {a.building ? `, ${a.building}` : ''}
                        {a.apartment ? `, ${a.apartment}` : ''}
                      </span>
                      <span className="block text-muted-foreground">
                        {a.city}
                        {a.area ? ` — ${a.area}` : ''} — {a.governorate}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              <li>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm">
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === null}
                    onChange={() => setSelectedAddressId(null)}
                  />
                  <span>{labels.useNewAddress}</span>
                </label>
              </li>
            </ul>
          </div>
        ) : null}

        {selectedAddressId === null ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>{labels.recipient}</span>
              <input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{labels.phone}</span>
              <input
                required
                type="tel"
                inputMode="tel"
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>{labels.governorate}</span>
              <select
                required
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">{labels.selectGov}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {isAr ? g.ar : g.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>{labels.city}</span>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{labels.area}</span>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>{labels.street}</span>
              <input
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{labels.building}</span>
              <input
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{labels.apartment}</span>
              <input
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>{labels.addressNotes}</span>
              <textarea
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                rows={2}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">{labels.payment}</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
          <input
            type="radio"
            name="payment"
            value="COD"
            className="mt-1"
            checked={paymentMethod === 'COD'}
            onChange={() => setPaymentMethod('COD')}
          />
          <span>
            <span className="font-medium">{labels.cod}</span>
            <span className="block text-muted-foreground">
              {labels.codDescription}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
          <input
            type="radio"
            name="payment"
            value="PAYMOB_CARD"
            className="mt-1"
            checked={paymentMethod === 'PAYMOB_CARD'}
            onChange={() => setPaymentMethod('PAYMOB_CARD')}
          />
          <span>
            <span className="font-medium">{labels.card}</span>
            <span className="block text-muted-foreground">
              {labels.cardDescription}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-2 rounded-md border bg-background p-4">
        <label className="space-y-1 text-sm">
          <span>{labels.notes}</span>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
