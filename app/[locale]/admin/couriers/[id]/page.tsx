import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { CourierForm } from '@/components/admin/courier-form';

export default async function EditCourierPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const courier = await prisma.courier.findUnique({ where: { id } });
  if (!courier) notFound();

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? `تعديل: ${courier.nameAr}` : `Edit: ${courier.nameEn}`}
      </h1>
      <CourierForm
        id={courier.id}
        initial={{
          nameAr: courier.nameAr,
          nameEn: courier.nameEn,
          phone: courier.phone ?? undefined,
          position: courier.position,
          active: courier.active,
        }}
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
