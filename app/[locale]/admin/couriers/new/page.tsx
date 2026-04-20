import { requireAdmin } from '@/lib/auth';
import { CourierForm } from '@/components/admin/courier-form';

export default async function NewCourierPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'شركة شحن جديدة' : 'New courier'}
      </h1>
      <CourierForm
        cancelHref="/admin/couriers"
        labels={{
          nameAr: isAr ? 'الاسم بالعربية' : 'Name (Arabic)',
          nameEn: isAr ? 'الاسم بالإنجليزية' : 'Name (English)',
          phone: isAr ? 'الهاتف' : 'Phone',
          position: isAr ? 'ترتيب العرض' : 'Sort order',
          active: isAr ? 'نشط' : 'Active',
          save: isAr ? 'حفظ' : 'Save',
          cancel: isAr ? 'إلغاء' : 'Cancel',
        }}
      />
    </div>
  );
}
