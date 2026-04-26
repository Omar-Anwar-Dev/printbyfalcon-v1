'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Reusable single-image upload widget for catalog entities (Brand logo,
 * Category image, etc). Generic over the upload + clear server actions —
 * the parent passes them in so the same component drives any per-entity
 * upload flow without server-action coupling living in the UI layer.
 *
 * Note: the URL builder is also passed in so this component never imports
 * `lib/storage/paths.ts` (which pulls Node.js built-ins via `path` and
 * webpack refuses to bundle into the client). Same workaround used by
 * `components/admin/store-info-form.tsx`.
 */
export function EntityImageUploader({
  entityId,
  initialFilename,
  buildUrl,
  uploadAction,
  clearAction,
  locale,
  labels,
  helpText,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/avif',
  previewClassName = 'h-20 w-auto rounded-md border bg-muted/30 p-1',
  emptyClassName = 'flex h-20 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground',
}: {
  entityId: string;
  initialFilename: string | null;
  buildUrl: (filename: string) => string;
  uploadAction: (
    id: string,
    formData: FormData,
  ) => Promise<
    { ok: true; data: { filename: string } } | { ok: false; errorKey: string }
  >;
  clearAction: (
    id: string,
  ) => Promise<
    { ok: true; data: { ok: true } } | { ok: false; errorKey: string }
  >;
  locale: string;
  labels: {
    title: string;
    none: string;
    clear: string;
    uploaded: string;
    cleared: string;
    failed: string;
  };
  helpText: string;
  accept?: string;
  previewClassName?: string;
  emptyClassName?: string;
}) {
  const isAr = locale === 'ar';
  const [filename, setFilename] = useState<string | null>(initialFilename);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [errKey, setErrKey] = useState<string | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) return;
    setMsg(null);
    setErrKey(null);
    const fd = new FormData();
    fd.append('file', file);
    start(async () => {
      const res = await uploadAction(entityId, fd);
      if (!res.ok) {
        setErrKey(res.errorKey);
        setMsg(`${labels.failed} (${res.errorKey})`);
        return;
      }
      setFilename(res.data.filename);
      setMsg(labels.uploaded);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    });
  };

  const handleClear = () => {
    setMsg(null);
    setErrKey(null);
    start(async () => {
      const res = await clearAction(entityId);
      if (!res.ok) {
        setErrKey(res.errorKey);
        setMsg(`${labels.failed} (${res.errorKey})`);
        return;
      }
      setFilename(null);
      setMsg(labels.cleared);
      router.refresh();
    });
  };

  return (
    <section className="rounded-md border bg-background p-4">
      <h2 className="mb-3 text-base font-semibold">{labels.title}</h2>
      <div className="flex flex-wrap items-center gap-4">
        {filename ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={buildUrl(filename)} alt="" className={previewClassName} />
        ) : (
          <div className={emptyClassName}>{labels.none}</div>
        )}
        <div className="space-y-2">
          <input
            type="file"
            accept={accept}
            ref={fileRef}
            disabled={pending}
            className="block text-sm"
            onChange={handleUpload}
          />
          <div className="flex gap-2">
            {filename ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={pending}
              >
                {labels.clear}
              </Button>
            ) : null}
          </div>
          {msg ? (
            <p
              className={
                errKey
                  ? 'text-xs text-destructive'
                  : 'text-xs text-muted-foreground'
              }
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {msg}
            </p>
          ) : null}
          <p
            className="text-xs text-muted-foreground"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {helpText}
          </p>
        </div>
      </div>
    </section>
  );
}
