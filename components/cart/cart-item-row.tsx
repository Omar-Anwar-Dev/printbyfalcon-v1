'use client';

import Image from 'next/image';
import { useTransition } from 'react';
import { Link } from '@/lib/i18n/routing';
import { removeCartItemAction, updateCartItemAction } from '@/app/actions/cart';
import { formatEgp } from '@/lib/catalog/price';

type Props = {
  locale: 'ar' | 'en';
  item: {
    id: string;
    slug: string;
    sku: string;
    name: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
    imageUrl: string | null;
  };
};

const LABELS = {
  ar: {
    decrease: 'إنقاص',
    increase: 'زيادة',
    remove: 'إزالة',
    outOfStock: 'الكمية المتاحة أقل',
  },
  en: {
    decrease: 'Decrease',
    increase: 'Increase',
    remove: 'Remove',
    outOfStock: 'Insufficient stock',
  },
};

export function CartItemRow({ locale, item }: Props) {
  const labels = LABELS[locale];
  const [pending, startTransition] = useTransition();

  function update(next: number) {
    if (next < 0) return;
    startTransition(async () => {
      const res = await updateCartItemAction({
        cartItemId: item.id,
        qty: next,
      });
      if (!res.ok) alert(labels.outOfStock);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(item.id);
    });
  }

  return (
    <li className="flex gap-4 rounded-md border bg-background p-3">
      <Link
        href={`/products/${item.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.slug}`}
          className="block text-sm font-medium hover:underline"
        >
          {item.name}
        </Link>
        <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => update(item.qty - 1)}
            disabled={pending || item.qty <= 1}
            aria-label={labels.decrease}
            className="flex h-7 w-7 items-center justify-center rounded border bg-background disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{item.qty}</span>
          <button
            type="button"
            onClick={() => update(item.qty + 1)}
            disabled={pending}
            aria-label={labels.increase}
            className="flex h-7 w-7 items-center justify-center rounded border bg-background disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="ms-2 text-xs text-muted-foreground hover:text-destructive"
          >
            {labels.remove}
          </button>
        </div>
      </div>
      <div className="shrink-0 self-start text-sm font-semibold">
        {formatEgp(item.lineTotal, locale)}
      </div>
    </li>
  );
}
