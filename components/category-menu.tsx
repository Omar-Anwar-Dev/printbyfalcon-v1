'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/lib/i18n/routing';

type MenuCategory = {
  id: string;
  slug: string;
  label: string;
  children: Array<{ id: string; slug: string; label: string }>;
};

/**
 * Desktop category dropdown menu. Single `openId` state so clicking a second
 * trigger closes the first; click-outside and Escape also close; clicking
 * any link closes before navigating so the menu isn't left open across route
 * transitions.
 *
 * Built as a client component because the behaviour needs JS; categories
 * themselves are fetched by the parent Server Component and passed in.
 */
export function CategoryMenu({
  categories,
  allLabel,
}: {
  categories: MenuCategory[];
  allLabel: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openId) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openId]);

  return (
    <div ref={ref} className="flex items-center gap-5">
      {categories.map((cat) => {
        const isOpen = openId === cat.id;
        return (
          <div key={cat.id} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : cat.id)}
              className="cursor-pointer hover:text-primary"
            >
              {cat.label}
            </button>
            {isOpen ? (
              <div
                role="menu"
                className="absolute start-0 top-full z-50 mt-2 min-w-[200px] rounded-md border bg-background p-2 shadow-md"
              >
                <Link
                  href={`/categories/${cat.slug}`}
                  className="block rounded px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setOpenId(null)}
                >
                  {allLabel} {cat.label}
                </Link>
                {cat.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="block rounded px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setOpenId(null)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
