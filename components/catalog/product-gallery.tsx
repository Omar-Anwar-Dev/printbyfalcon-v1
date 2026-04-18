'use client';

import Image from 'next/image';
import { useState } from 'react';

type GalleryImage = {
  id: string;
  medium: string;
  original: string;
  altAr: string | null;
  altEn: string | null;
};

export function ProductGallery({
  images,
  locale,
  productName,
}: {
  images: GalleryImage[];
  locale: 'ar' | 'en';
  productName: string;
}) {
  const [activeId, setActiveId] = useState(images[0]?.id ?? null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        {locale === 'ar' ? 'لا توجد صورة' : 'No image'}
      </div>
    );
  }

  const active = images.find((i) => i.id === activeId) ?? images[0];
  const altFor = (img: GalleryImage) =>
    (locale === 'ar' ? img.altAr : img.altEn) ?? productName;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <Image
          key={active.id}
          src={active.original}
          alt={altFor(active)}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-contain"
          unoptimized
        />
      </div>
      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {images.map((img) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActiveId(img.id)}
                className={`relative h-16 w-16 overflow-hidden rounded border ${img.id === active.id ? 'border-primary ring-2 ring-primary' : 'border-input'}`}
                aria-label={altFor(img)}
              >
                <Image
                  src={img.medium}
                  alt={altFor(img)}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
