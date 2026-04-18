'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  uploadProductImageAction,
  updateProductImageAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ImageItem = {
  id: string;
  url: string; // thumb URL
  altAr: string | null;
  altEn: string | null;
};

type Labels = {
  images: string;
  noImages: string;
  uploadImage: string;
  uploadHint: string;
  altAr: string;
  altEn: string;
  delete: string;
  moveUp: string;
  moveDown: string;
  confirmDelete: string;
  save: string;
};

export function ProductImageManager({
  productId,
  initial,
  labels,
}: {
  productId: string;
  initial: ImageItem[];
  labels: Labels;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ImageItem[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const refresh = () => router.refresh();

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    for (const file of list) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadProductImageAction(productId, fd);
      if (!res.ok) {
        setError(res.errorKey);
        break;
      }
    }
    refresh();
  };

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const input = e.currentTarget;
    start(async () => {
      await uploadFiles(files);
      input.value = '';
    });
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    start(() => uploadFiles(files));
  };

  const handleDelete = (id: string) => {
    if (!confirm(labels.confirmDelete)) return;
    start(async () => {
      const res = await deleteProductImageAction(id);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setItems((is) => is.filter((i) => i.id !== id));
      refresh();
    });
  };

  const move = (idx: number, delta: number) => {
    const next = items.slice();
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    start(async () => {
      const res = await reorderProductImagesAction(
        productId,
        next.map((n) => n.id),
      );
      if (!res.ok) setError(res.errorKey);
      refresh();
    });
  };

  const saveAlt = (id: string, altAr: string, altEn: string) => {
    start(async () => {
      const res = await updateProductImageAction({ id, altAr, altEn });
      if (!res.ok) setError(res.errorKey);
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{labels.images}</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-sm transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-input bg-background'}`}
      >
        <Label
          htmlFor="image-upload"
          className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {labels.uploadImage}
        </Label>
        <input
          id="image-upload"
          type="file"
          multiple
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleUpload}
          disabled={pending}
        />
        <span className="text-xs text-muted-foreground">
          {labels.uploadHint}
        </span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.noImages}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((img, idx) => (
            <ImageCard
              key={img.id}
              img={img}
              labels={labels}
              disabled={pending}
              onDelete={() => handleDelete(img.id)}
              onMoveUp={idx > 0 ? () => move(idx, -1) : undefined}
              onMoveDown={
                idx < items.length - 1 ? () => move(idx, 1) : undefined
              }
              onSaveAlt={(altAr, altEn) => saveAlt(img.id, altAr, altEn)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ImageCard({
  img,
  labels,
  disabled,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSaveAlt,
}: {
  img: ImageItem;
  labels: Labels;
  disabled: boolean;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaveAlt: (altAr: string, altEn: string) => void;
}) {
  const [altAr, setAltAr] = useState(img.altAr ?? '');
  const [altEn, setAltEn] = useState(img.altEn ?? '');

  return (
    <li className="rounded-md border p-3">
      <div className="flex gap-3">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-muted">
          <Image
            src={img.url}
            alt={altAr || altEn || ''}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">{labels.altAr}</Label>
            <Input
              value={altAr}
              onChange={(e) => setAltAr(e.target.value)}
              onBlur={() => onSaveAlt(altAr, altEn)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{labels.altEn}</Label>
            <Input
              value={altEn}
              onChange={(e) => setAltEn(e.target.value)}
              onBlur={() => onSaveAlt(altAr, altEn)}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveUp}
          disabled={!onMoveUp || disabled}
        >
          ↑ {labels.moveUp}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMoveDown}
          disabled={!onMoveDown || disabled}
        >
          ↓ {labels.moveDown}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
        >
          {labels.delete}
        </Button>
      </div>
    </li>
  );
}
