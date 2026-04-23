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
    <li className="flex gap-4 rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-card">
      <Link
        href={`/products/${item.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-paper-hover sm:h-24 sm:w-24"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.slug}`}
          className="block text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent-strong"
        >
          {item.name}
        </Link>
        <p className="num mt-0.5 font-mono text-[11px] text-muted-foreground">
          {item.sku}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center rounded-md border border-border bg-background"
            aria-label={labels.decrease}
          >
            <button
              type="button"
              onClick={() => update(item.qty - 1)}
              disabled={pending || item.qty <= 1}
              aria-label={labels.decrease}
              className="inline-flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-paper-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="num w-8 text-center text-sm font-semibold tabular-nums">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => update(item.qty + 1)}
              disabled={pending}
              aria-label={labels.increase}
              className="inline-flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-paper-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-error-soft hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labels.remove}
          </button>
        </div>
      </div>
      <div className="num shrink-0 self-start whitespace-nowrap text-sm font-bold text-foreground">
        {formatEgp(item.lineTotal, locale)}
      </div>
    </li>
  );
}
