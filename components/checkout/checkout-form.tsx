'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  createOrderAction,
  submitForReviewOrderAction,
} from '@/app/actions/checkout';
import { applyPromoCodeAction } from '@/app/actions/promo';
import { GOVERNORATE_OPTIONS, governorateLabel } from '@/lib/i18n/governorates';
import type { Governorate } from '@prisma/client';

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

type B2BProps = {
  companyName: string;
  allowPayNow: boolean;
  allowSubmitForReview: boolean;
  tierCode: 'A' | 'B' | 'C';
};

type CartItemView = {
  id: string;
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  thumbUrl: string | null;
  qty: number;
  unitPriceEgp: number;
  vatExempt: boolean;
};

type ZoneInfo = {
  zoneId: string;
  zoneCode: string;
  zoneNameAr: string;
  zoneNameEn: string;
  baseRateEgp: number;
  codEnabled: boolean;
  freeShippingThresholdB2cEgp: number | null;
  freeShippingThresholdB2bEgp: number | null;
};

type CodPolicyView = {
  enabled: boolean;
  feeType: 'FIXED' | 'PERCENT';
  feeValue: number;
  maxOrderEgp: number;
};

type AppliedPromo = {
  code: string;
  discountEgp: number;
  type: 'PERCENT' | 'FIXED';
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
  b2b?: B2BProps | null;
  viewerType: 'B2B' | 'B2C';
  cartItems: CartItemView[];
  subtotalEgp: number;
  shippingByGovernorate: Record<Governorate, ZoneInfo>;
  globalThresholds: { b2cEgp: number; b2bEgp: number };
  codPolicy: CodPolicyView;
  vatRatePercent: number;
};

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
    codUnavailable: 'الدفع عند الاستلام غير متاح حاليًا لهذه المنطقة.',
    codOverLimit: 'قيمة الطلب تتجاوز الحد المسموح للدفع عند الاستلام.',
    notes: 'ملاحظات للطلب (اختياري)',
    submit: 'تأكيد الطلب',
    submitting: 'جارٍ المعالجة...',
    selectGov: '-- اختر المحافظة --',
    b2bIdentity: 'بيانات الشركة',
    placedByLabel: 'اسم من قدّم الطلب',
    placedByHelp: 'لتوثيق من وضع الطلب داخل الشركة (يظهر على الفاتورة).',
    placedByRequired: 'اسم مُقدِّم الطلب مطلوب عند إرسال الطلب للمراجعة.',
    poReferenceLabel: 'رقم أمر الشراء (اختياري)',
    poReferenceHelp: 'هيظهر على الفاتورة لو حضرتك بعتّه.',
    checkoutModeTitle: 'طريقة إتمام الطلب',
    payNowLabel: 'ادفع الآن',
    payNowHelp: 'أكمل الدفع فورًا (بطاقة أو كاش).',
    submitForReviewLabel: 'ارسل الطلب للمراجعة',
    submitForReviewHelp: 'ممثل المبيعات هيراجع الطلب ويتواصل معك خلال 24 ساعة.',
    submitSfr: 'ارسال الطلب للمراجعة',
    sfrPendingCopy:
      'هنسجّل الطلب بحالة "بانتظار تأكيد المبيعات" ونخليك تعرف بمجرد تأكيده.',
    summary: 'ملخص الطلب',
    subtotal: 'الإجمالي قبل الشحن',
    discount: 'الخصم',
    shipping: 'الشحن',
    codFee: 'رسوم الدفع عند الاستلام',
    vat: 'ضريبة القيمة المضافة (14%)',
    total: 'الإجمالي',
    freeShippingAchieved: 'شحن مجاني مُفعَّل!',
    freeShippingProgress: (remaining: string) =>
      `أضف بقيمة ${remaining} ج.م لتحصل على شحن مجاني.`,
    promoCode: 'كود خصم',
    promoCodePlaceholder: 'أدخل كود الخصم',
    apply: 'تطبيق',
    remove: 'إزالة',
    promoApplied: (code: string, amount: string) =>
      `تم تطبيق ${code} — خصم ${amount} ج.م`,
    unknownZone:
      'هذه المحافظة غير مهيأة للشحن — من فضلك تواصل معنا عبر واتساب.',
    zoneInfo: (zone: string, rate: string) => `${zone} — ${rate} ج.م`,
    egp: 'ج.م',
    errors: {
      'cart.empty': 'سلتك فارغة',
      'cart.insufficient_stock':
        'الكمية المتاحة لأحد المنتجات أقل من المطلوب — عدّل السلة وحاول مرة أخرى.',
      'cart.item_unavailable': 'أحد المنتجات في سلتك مش متاح الآن.',
      'validation.invalid': 'من فضلك تأكد من بيانات الطلب.',
      'order.payment_setup_failed': 'حصل مشكلة في إعداد الدفع. حاول تاني.',
      'checkout.pay_now_not_allowed':
        'الشركة بتاعتك مضبوطة على "إرسال الطلب للمراجعة" فقط. تواصل مع ممثل المبيعات لتغيير الإعداد.',
      'checkout.submit_for_review_not_allowed':
        'هذا الإعداد غير متاح لشركتك — يُرجى استخدام "ادفع الآن".',
      'checkout.b2b_required': 'ده خيار خاص بحسابات B2B المفعَّلة.',
      'checkout.zone_not_configured':
        'هذه المحافظة غير مهيأة للشحن — من فضلك تواصل معنا.',
      'checkout.cod_not_available_for_zone':
        'الدفع عند الاستلام غير متاح لمحافظتك أو الحد الأقصى تخطى — اختر الدفع بالبطاقة.',
      'promo.not_found': 'كود الخصم غير صحيح.',
      'promo.inactive': 'هذا الكود غير مفعّل.',
      'promo.not_started': 'هذا الكود لم يبدأ سريانه بعد.',
      'promo.expired': 'هذا الكود انتهى صلاحيته.',
      'promo.usage_limit_reached': 'تم استنفاد حد استخدام هذا الكود.',
      'promo.min_order_not_met':
        'قيمة الطلب أقل من الحد الأدنى لتطبيق هذا الكود.',
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
    codUnavailable: 'Cash on delivery is unavailable for this area right now.',
    codOverLimit: 'Order value exceeds the COD maximum.',
    notes: 'Order notes (optional)',
    submit: 'Place order',
    submitting: 'Processing…',
    selectGov: '-- Select governorate --',
    b2bIdentity: 'Company details',
    placedByLabel: 'Placed by (name)',
    placedByHelp: 'For traceability across your team (shown on the invoice).',
    placedByRequired: 'A name is required when submitting for review.',
    poReferenceLabel: 'PO reference (optional)',
    poReferenceHelp: "If supplied, it'll be printed on the invoice.",
    checkoutModeTitle: 'How would you like to complete this order?',
    payNowLabel: 'Pay Now',
    payNowHelp: 'Complete payment now (card or cash on delivery).',
    submitForReviewLabel: 'Submit for Review',
    submitForReviewHelp:
      'Sales rep reviews the order and reaches out within 24 hours.',
    submitSfr: 'Submit for Review',
    sfrPendingCopy:
      "We'll place the order in Pending Confirmation and notify you as soon as it's confirmed.",
    summary: 'Order summary',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    codFee: 'COD fee',
    vat: 'VAT (14%)',
    total: 'Total',
    freeShippingAchieved: 'Free shipping unlocked!',
    freeShippingProgress: (remaining: string) =>
      `Add ${remaining} EGP more for free shipping.`,
    promoCode: 'Promo code',
    promoCodePlaceholder: 'Enter promo code',
    apply: 'Apply',
    remove: 'Remove',
    promoApplied: (code: string, amount: string) =>
      `${code} applied — ${amount} EGP off`,
    unknownZone:
      "This governorate isn't configured for shipping — please contact us on WhatsApp.",
    zoneInfo: (zone: string, rate: string) => `${zone} — ${rate} EGP`,
    egp: 'EGP',
    errors: {
      'cart.empty': 'Your cart is empty.',
      'cart.insufficient_stock':
        "One of your items doesn't have enough stock — adjust quantities and retry.",
      'cart.item_unavailable': 'One of your items is no longer available.',
      'validation.invalid': 'Please check the order details.',
      'order.payment_setup_failed': 'Payment setup failed. Please try again.',
      'checkout.pay_now_not_allowed':
        'Your company is configured for Submit-for-Review only. Contact your sales rep to change this.',
      'checkout.submit_for_review_not_allowed':
        'Submit-for-Review is not enabled for your company — please use Pay Now.',
      'checkout.b2b_required':
        'This option is only available to active B2B accounts.',
      'checkout.zone_not_configured':
        "We don't ship to this governorate yet — please contact us.",
      'checkout.cod_not_available_for_zone':
        "Cash on delivery isn't available for your area or exceeds the limit — please pay by card.",
      'promo.not_found': 'Promo code not found.',
      'promo.inactive': 'This promo code is inactive.',
      'promo.not_started': 'This promo code is not active yet.',
      'promo.expired': 'This promo code has expired.',
      'promo.usage_limit_reached': 'This promo code has reached its limit.',
      'promo.min_order_not_met':
        "Order subtotal doesn't meet this code's minimum.",
      generic: 'Something went wrong — please try again.',
    },
  },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function fmt(n: number, locale: 'ar' | 'en'): string {
  return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CheckoutForm({
  locale,
  user,
  savedAddresses,
  b2b,
  viewerType,
  cartItems,
  subtotalEgp,
  shippingByGovernorate,
  globalThresholds,
  codPolicy,
  vatRatePercent,
}: Props) {
  const labels = LABELS[locale];
  const router = useRouter();
  const isAr = locale === 'ar';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultMode: 'payNow' | 'sfr' =
    b2b && !b2b.allowPayNow && b2b.allowSubmitForReview ? 'sfr' : 'payNow';
  const [checkoutMode, setCheckoutMode] = useState<'payNow' | 'sfr'>(
    defaultMode,
  );
  const [placedByName, setPlacedByName] = useState('');
  const [poReference, setPoReference] = useState('');

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

  // Sprint 9 — promo code UI state.
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromoTransition] = useTransition();

  // Active address governorate drives zone-based shipping / COD availability.
  const activeGovernorate: string = selectedAddress
    ? selectedAddress.governorate
    : governorate;

  const zoneInfo = activeGovernorate
    ? shippingByGovernorate[activeGovernorate as Governorate]
    : undefined;

  const totals = useMemo(() => {
    const subtotal = round2(subtotalEgp);
    const promoDiscount = appliedPromo ? round2(appliedPromo.discountEgp) : 0;

    if (!zoneInfo) {
      return {
        subtotal,
        shipping: 0,
        codFee: 0,
        discount: promoDiscount,
        vat: 0,
        total: round2(subtotal - promoDiscount),
        freeShipped: false,
        freeShipThreshold: 0,
        codAvailable: false,
      };
    }

    const thresholdOverride =
      viewerType === 'B2B'
        ? zoneInfo.freeShippingThresholdB2bEgp
        : zoneInfo.freeShippingThresholdB2cEgp;
    const threshold =
      thresholdOverride !== null
        ? thresholdOverride
        : viewerType === 'B2B'
          ? globalThresholds.b2bEgp
          : globalThresholds.b2cEgp;
    const freeShipped = subtotal >= threshold;
    const shipping = freeShipped ? 0 : zoneInfo.baseRateEgp;

    const codAvailable =
      zoneInfo.codEnabled &&
      codPolicy.enabled &&
      subtotal <= codPolicy.maxOrderEgp;
    const willApplyCod =
      paymentMethod === 'COD' && codAvailable && checkoutMode === 'payNow';
    const codFee = willApplyCod
      ? codPolicy.feeType === 'FIXED'
        ? round2(codPolicy.feeValue)
        : round2((subtotal * codPolicy.feeValue) / 100)
      : 0;

    // VAT per-line with promo-discount proration (matches server math).
    let vat = 0;
    if (subtotal > 0 && vatRatePercent > 0) {
      for (const item of cartItems) {
        if (item.vatExempt) continue;
        const lineTotal = item.unitPriceEgp * item.qty;
        const promoShare =
          promoDiscount > 0 ? promoDiscount * (lineTotal / subtotal) : 0;
        const taxableLineTotal = Math.max(0, lineTotal - promoShare);
        vat += (taxableLineTotal * vatRatePercent) / 100;
      }
    }
    vat = round2(vat);

    const total = round2(subtotal + shipping + codFee + vat - promoDiscount);

    return {
      subtotal,
      shipping,
      codFee,
      discount: promoDiscount,
      vat,
      total,
      freeShipped,
      freeShipThreshold: threshold,
      codAvailable,
    };
  }, [
    appliedPromo,
    cartItems,
    checkoutMode,
    codPolicy,
    globalThresholds,
    paymentMethod,
    subtotalEgp,
    vatRatePercent,
    viewerType,
    zoneInfo,
  ]);

  // If COD becomes unavailable (user picked a Sinai address), silently flip
  // the picker to PAYMOB_CARD so the summary stays consistent.
  if (paymentMethod === 'COD' && !totals.codAvailable && zoneInfo) {
    // Defer the setState to the next tick to avoid "setState during render".
    setTimeout(() => setPaymentMethod('PAYMOB_CARD'), 0);
  }

  function onApplyPromo() {
    setPromoError(null);
    const trimmed = promoInput.trim();
    if (!trimmed) return;
    startPromoTransition(async () => {
      const r = await applyPromoCodeAction({ code: trimmed });
      if (!r.ok) {
        const key = r.errorKey as keyof typeof labels.errors;
        setPromoError(labels.errors[key] ?? labels.errors.generic);
        return;
      }
      setAppliedPromo(r.data);
      setPromoInput(r.data.code);
    });
  }

  function onRemovePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  }

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

    if (b2b && checkoutMode === 'sfr') {
      if (!placedByName.trim()) {
        setError(labels.placedByRequired);
        return;
      }
      startTransition(async () => {
        const res = await submitForReviewOrderAction({
          contact: {
            name: contactName,
            phone: contactPhone,
            email: contactEmail,
          },
          address: addressPayload as Parameters<
            typeof submitForReviewOrderAction
          >[0]['address'],
          placedByName: placedByName.trim(),
          poReference,
          customerNotes,
          promoCode: appliedPromo?.code ?? '',
        });
        if (!res.ok) {
          const key = res.errorKey as keyof typeof labels.errors;
          setError(labels.errors[key] ?? labels.errors.generic);
          return;
        }
        router.push(res.data.redirectUrl);
      });
      return;
    }

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
        placedByName: b2b ? placedByName : '',
        poReference: b2b ? poReference : '',
        promoCode: appliedPromo?.code ?? '',
      });
      if (!res.ok) {
        const key = res.errorKey as keyof typeof labels.errors;
        setError(labels.errors[key] ?? labels.errors.generic);
        return;
      }
      const target = res.data.redirectUrl;
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        router.push(target);
      }
    });
  }

  const summary = (
    <aside className="h-fit space-y-5 rounded-xl border border-border bg-paper p-5 md:sticky md:top-36 md:self-start">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {labels.summary}
      </h2>
      <ul className="space-y-2.5 text-sm">
        {cartItems.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            {i.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={i.thumbUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-md bg-paper-hover" />
            )}
            <span className="min-w-0 flex-1 truncate text-foreground">
              {isAr ? i.nameAr : i.nameEn}{' '}
              <span className="num text-muted-foreground">× {i.qty}</span>
            </span>
            <span className="num shrink-0 whitespace-nowrap font-semibold text-foreground">
              {fmt(i.unitPriceEgp * i.qty, locale)} {labels.egp}
            </span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{labels.subtotal}</dt>
          <dd className="num font-medium text-foreground">
            {fmt(totals.subtotal, locale)} {labels.egp}
          </dd>
        </div>
        {totals.discount > 0 ? (
          <div className="flex justify-between text-success">
            <dt>{labels.discount}</dt>
            <dd className="num font-medium">
              − {fmt(totals.discount, locale)} {labels.egp}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{labels.shipping}</dt>
          <dd className="num">
            {zoneInfo ? (
              totals.freeShipped ? (
                <span className="font-semibold text-success">
                  {labels.freeShippingAchieved}
                </span>
              ) : (
                <span className="text-foreground">
                  {fmt(totals.shipping, locale)} {labels.egp}
                </span>
              )
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        {totals.codFee > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{labels.codFee}</dt>
            <dd className="num text-foreground">
              {fmt(totals.codFee, locale)} {labels.egp}
            </dd>
          </div>
        ) : null}
        {totals.vat > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{labels.vat}</dt>
            <dd className="num text-foreground">
              {fmt(totals.vat, locale)} {labels.egp}
            </dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
          <dt className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
            {labels.total}
          </dt>
          <dd className="num text-xl font-bold text-foreground">
            {fmt(totals.total, locale)} {labels.egp}
          </dd>
        </div>
      </dl>
      {zoneInfo && !totals.freeShipped && totals.freeShipThreshold > 0 ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-accent-strong">
          {labels.freeShippingProgress(
            fmt(
              Math.max(0, totals.freeShipThreshold - totals.subtotal),
              locale,
            ),
          )}
        </p>
      ) : null}
      {zoneInfo ? (
        <p className="text-xs text-muted-foreground">
          {labels.zoneInfo(
            isAr ? zoneInfo.zoneNameAr : zoneInfo.zoneNameEn,
            fmt(zoneInfo.baseRateEgp, locale),
          )}
        </p>
      ) : null}
    </aside>
  );

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
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

        <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
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
                          {a.area ? ` — ${a.area}` : ''} —{' '}
                          {governorateLabel(a.governorate, locale)}
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
                  {GOVERNORATE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {isAr ? g.labelAr : g.labelEn}
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

          {activeGovernorate && !zoneInfo ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {labels.unknownZone}
            </p>
          ) : null}
        </section>

        {b2b ? (
          <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
            <h2 className="text-base font-semibold">{labels.b2bIdentity}</h2>
            <p className="text-xs text-muted-foreground">
              {b2b.companyName} · Tier {b2b.tierCode}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>
                  {labels.placedByLabel}
                  {checkoutMode === 'sfr' ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </span>
                <input
                  value={placedByName}
                  onChange={(e) => setPlacedByName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  required={checkoutMode === 'sfr'}
                />
                <span className="block text-xs text-muted-foreground">
                  {labels.placedByHelp}
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span>{labels.poReferenceLabel}</span>
                <input
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
                <span className="block text-xs text-muted-foreground">
                  {labels.poReferenceHelp}
                </span>
              </label>
            </div>
          </section>
        ) : null}

        {b2b && b2b.allowPayNow && b2b.allowSubmitForReview ? (
          <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
            <h2 className="text-base font-semibold">
              {labels.checkoutModeTitle}
            </h2>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
              <input
                type="radio"
                name="checkoutMode"
                value="payNow"
                className="mt-1"
                checked={checkoutMode === 'payNow'}
                onChange={() => setCheckoutMode('payNow')}
              />
              <span>
                <span className="font-medium">{labels.payNowLabel}</span>
                <span className="block text-muted-foreground">
                  {labels.payNowHelp}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
              <input
                type="radio"
                name="checkoutMode"
                value="sfr"
                className="mt-1"
                checked={checkoutMode === 'sfr'}
                onChange={() => setCheckoutMode('sfr')}
              />
              <span>
                <span className="font-medium">
                  {labels.submitForReviewLabel}
                </span>
                <span className="block text-muted-foreground">
                  {labels.submitForReviewHelp}
                </span>
              </span>
            </label>
          </section>
        ) : null}

        {checkoutMode === 'payNow' ? (
          <section className="space-y-4 rounded-xl border border-border bg-paper p-5">
            <h2 className="text-base font-semibold">{labels.payment}</h2>
            {totals.codAvailable ? (
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
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <span className="font-medium">{labels.cod}</span>
                <span className="block">
                  {zoneInfo && totals.subtotal > codPolicy.maxOrderEgp
                    ? labels.codOverLimit
                    : labels.codUnavailable}
                </span>
              </div>
            )}
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
        ) : (
          <section className="space-y-2 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
            <p className="font-medium">{labels.submitForReviewLabel}</p>
            <p className="text-muted-foreground">{labels.sfrPendingCopy}</p>
          </section>
        )}

        <section className="space-y-2 rounded-md border bg-background p-4">
          <h2 className="text-base font-semibold">{labels.promoCode}</h2>
          {appliedPromo ? (
            <div className="flex items-center justify-between rounded-md border border-success/30 bg-success-soft p-3 text-sm">
              <span className="font-medium text-success">
                {labels.promoApplied(
                  appliedPromo.code,
                  fmt(appliedPromo.discountEgp, locale),
                )}
              </span>
              <button
                type="button"
                onClick={onRemovePromo}
                className="text-xs font-medium text-success underline underline-offset-2"
              >
                {labels.remove}
              </button>
            </div>
          ) : (
            <div className="flex items-stretch gap-2">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder={labels.promoCodePlaceholder}
                maxLength={40}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={onApplyPromo}
                disabled={promoPending || !promoInput.trim()}
                className="rounded-md border bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {labels.apply}
              </button>
            </div>
          )}
          {promoError ? (
            <p className="text-xs text-destructive">{promoError}</p>
          ) : null}
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
          disabled={pending || (activeGovernorate !== '' && !zoneInfo)}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? labels.submitting
            : checkoutMode === 'sfr'
              ? labels.submitSfr
              : labels.submit}
        </button>
      </form>
      {summary}
    </>
  );
}
