'use client';

import {
  uploadCategoryImageAction,
  clearCategoryImageAction,
} from '@/app/actions/admin-catalog-media';
import { EntityImageUploader } from '@/components/admin/entity-image-uploader';

const buildCategoryImageUrl = (filename: string) =>
  `/storage/category-images/${filename}`;

export function CategoryImageUploader({
  categoryId,
  initialFilename,
  locale,
}: {
  categoryId: string;
  initialFilename: string | null;
  locale: string;
}) {
  const isAr = locale === 'ar';
  return (
    <EntityImageUploader
      entityId={categoryId}
      initialFilename={initialFilename}
      buildUrl={buildCategoryImageUrl}
      uploadAction={uploadCategoryImageAction}
      clearAction={clearCategoryImageAction}
      locale={locale}
      labels={{
        title: isAr ? 'صورة الفئة' : 'Category image',
        none: isAr ? 'لا توجد صورة' : 'none',
        clear: isAr ? 'إزالة' : 'Clear',
        uploaded: isAr ? 'تم رفع الصورة' : 'Image uploaded',
        cleared: isAr ? 'تم إزالة الصورة' : 'Image cleared',
        failed: isAr ? 'فشل العملية' : 'Failed',
      }}
      // Larger preview for category photos.
      previewClassName="h-28 w-40 rounded-md border bg-muted/30 object-cover"
      emptyClassName="flex h-28 w-40 items-center justify-center rounded-md border text-xs text-muted-foreground"
      // SVG isn't a great fit for category hero photos but the validator
      // allows it; offering it in the picker would invite confusion.
      accept="image/png,image/jpeg,image/webp,image/avif"
      helpText={
        isAr
          ? 'JPG / PNG / WebP (حتى 5MB، 1200px max). تظهر كخلفية لكارت الفئة في الصفحة الرئيسية وفي رأس صفحة الفئة.'
          : 'JPG / PNG / WebP (up to 5MB, 1200px max). Used as the category card background on the homepage and the category landing header.'
      }
    />
  );
}
