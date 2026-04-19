'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import Image from 'next/image';

type Suggestion = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  basePriceEgp: string;
  primaryImageUrl: string | null;
};

type Props = {
  locale: 'ar' | 'en';
};

const DEBOUNCE_MS = 180;

const LABELS = {
  ar: {
    placeholder: 'ابحث عن منتج أو طابعة...',
    seeAll: (n: number) => `عرض كل النتائج (${n})`,
    noResults: 'لا توجد نتائج',
    ariaLabel: 'البحث في الكتالوج',
  },
  en: {
    placeholder: 'Search products or printers...',
    seeAll: (n: number) => `See all results (${n})`,
    noResults: 'No results',
    ariaLabel: 'Search catalog',
  },
};

export function HeaderSearch({ locale }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [activeIdx, setActiveIdx] = useState(-1);
  const labels = LABELS[locale];
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((json: { suggestions: Suggestion[] }) => {
          setSuggestions(json.suggestions ?? []);
          setActiveIdx(-1);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setSuggestions([]);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function submit(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setOpen(false);
    startTransition(() => {
      router.push({ pathname: '/search', query: { q: trimmed } });
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx((i) =>
        suggestions.length === 0 ? -1 : (i + 1) % suggestions.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) =>
        suggestions.length === 0
          ? -1
          : (i - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        e.preventDefault();
        const pick = suggestions[activeIdx];
        setOpen(false);
        startTransition(() => {
          router.push(`/products/${pick.slug}`);
        });
      } else {
        submit(q);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown =
    open && q.trim().length > 0 && (suggestions.length > 0 || !loading);
  const isAr = locale === 'ar';

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <label className="sr-only" htmlFor={`${listboxId}-input`}>
          {labels.ariaLabel}
        </label>
        <input
          id={`${listboxId}-input`}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={labels.placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
          }
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute end-0 start-0 z-50 mt-1 max-h-96 overflow-auto rounded-md border bg-background shadow-lg"
        >
          {suggestions.length === 0 && !loading ? (
            <p className="p-3 text-sm text-muted-foreground">
              {labels.noResults}
            </p>
          ) : (
            <ul>
              {suggestions.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => {
                      router.push(`/products/${s.slug}`);
                    });
                  }}
                  className={`flex cursor-pointer items-center gap-3 border-t px-3 py-2 first:border-t-0 ${
                    i === activeIdx ? 'bg-muted' : ''
                  }`}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    {s.primaryImageUrl ? (
                      <Image
                        src={s.primaryImageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isAr ? s.nameAr : s.nameEn}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.sku}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {Number(s.basePriceEgp).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}{' '}
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </li>
              ))}
              <li className="border-t">
                <button
                  type="button"
                  onClick={() => submit(q)}
                  className="block w-full px-3 py-2 text-center text-sm font-medium text-primary hover:bg-muted"
                >
                  {labels.seeAll(suggestions.length)}
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
