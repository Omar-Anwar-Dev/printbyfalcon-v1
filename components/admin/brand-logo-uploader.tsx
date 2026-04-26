'use client';

import {
  uploadCatalogBrandLogoAction,
  clearCatalogBrandLogoAction,
} from '@/app/actions/admin-catalog-media';
import { EntityImageUploader } from '@/components/admin/entity-image-uploader';

// Same client-safe URL workaround as components/admin/store-info-form.tsx —
// the path-helpers module pulls Node built-ins, which webpack won't bundle
// into a client component. Mirror the Nginx prefix here.
const buildBrandLogoUrl = (filename: string) =>
  `/storage/brand-logos/${filename}`;

export function BrandLogoUploader({
  brandId,
  initialFilename,
  locale,
}: {
  brandId: string;
  initialFilename: string | null;
  locale: string;
}) {
  const isAr = locale === 'ar';
  return (
    <EntityImageUploader
      entityId={brandId}
      initialFilename={initialFilename}
      buildUrl={buildBrandLogoUrl}
      uploadAction={uploadCatalogBrandLogoAction}
      clearAction={clearCatalogBrandLogoAction}
      locale={locale}
      labels={{
        title: isAr ? 'شعار العلامة التجارية' : 'Brand logo',
        none: isAr ? 'لا يوجد' : 'none',
        clear: isAr ? 'إزالة' : 'Clear',
        uploaded: isAr ? 'تم رفع الشعار' : 'Logo uploaded',
        cleared: isAr ? 'تم إزالة الشعار' : 'Logo cleared',
        failed: isAr ? 'فشل العملية' : 'Failed',
      }}
      helpText={
        isAr
          ? 'PNG / JPG / WebP / SVG (حتى 2MB). يُفضّل SVG للحفاظ على نقاء العلامة. الصور الراسترية يُعاد ترميزها إلى WebP ≤ 400px.'
          : 'PNG / JPG / WebP / SVG (up to 2MB). SVG preferred to keep wordmarks crisp; raster images re-encoded to WebP ≤ 400px.'
      }
    />
  );
}
