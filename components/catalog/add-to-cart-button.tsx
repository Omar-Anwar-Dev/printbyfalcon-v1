'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { addToCartAction } from '@/app/actions/cart';

type Props = {
  productId: string;
  locale: 'ar' | 'en';
  disabled?: boolean;
};

const LABELS = {
  ar: {
    add: 'أضف إلى السلة',
    adding: 'جارٍ الإضافة…',
    added: 'تمت الإضافة ✓',
    outOfStock: 'الكمية المتاحة غير كافية',
    failed: 'حصل خطأ — حاول تاني',
    goToCart: 'الذهاب إلى السلة',
  },
  en: {
    add: 'Add to cart',
    adding: 'Adding…',
    added: 'Added ✓',
    outOfStock: 'Not enough stock',
    failed: 'Something went wrong',
    goToCart: 'Go to cart',
  },
};

export function AddToCartButton({ productId, locale, disabled }: Props) {
  const labels = LABELS[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    setStatus('idle');
    setErrorMsg(null);
    startTransition(async () => {
      const res = await addToCartAction({ productId, qty: 1 });
      if (res.ok) {
        setStatus('added');
        setTimeout(() => setStatus('idle'), 1800);
      } else {
        setStatus('error');
        setErrorMsg(
          res.errorKey === 'cart.insufficient_stock'
            ? labels.outOfStock
            : labels.failed,
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || disabled}
        className={`inline-flex h-11 items-center justify-center rounded-md px-6 font-medium transition-colors disabled:opacity-50 ${
          status === 'added'
            ? 'bg-success text-canvas'
            : 'bg-accent text-accent-foreground hover:bg-accent-strong'
        }`}
      >
        {pending
          ? labels.adding
          : status === 'added'
            ? labels.added
            : labels.add}
      </button>
      {status === 'added' ? (
        <button
          type="button"
          onClick={() => router.push('/cart')}
          className="block text-xs text-accent-strong hover:underline"
        >
          {labels.goToCart}
        </button>
      ) : null}
      {status === 'error' && errorMsg ? (
        <p className="text-xs text-destructive">{errorMsg}</p>
      ) : null}
    </div>
  );
}
