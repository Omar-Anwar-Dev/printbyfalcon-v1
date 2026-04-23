import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CourierRowActions } from '@/components/admin/courier-row-actions';

export default async function AdminCouriersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const couriers = await prisma.courier.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: [{ active: 'desc' }, { position: 'asc' }, { nameEn: 'asc' }],
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'شركات الشحن' : 'Couriers'}
        </h1>
        <Button asChild>
          <Link href="/admin/couriers/new">
            + {isAr ? 'شركة جديدة' : 'New courier'}
          </Link>
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {isAr
          ? 'تظهر شركات الشحن النشطة في نموذج تسليم الطلب. إلغاء التنشيط يخفي الشركة من القائمة دون حذف السجل أو المساس بالطلبات السابقة.'
          : 'Active couriers show in the order-handoff modal. Deactivate hides a courier from new handoffs without touching existing orders.'}
      </p>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="p-3 text-start">{isAr ? 'الهاتف' : 'Phone'}</th>
              <th className="p-3 text-start">
                {isAr ? 'ترتيب العرض' : 'Sort order'}
              </th>
              <th className="p-3 text-start">
                {isAr ? 'طلبات مرتبطة' : 'Linked orders'}
              </th>
              <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="p-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {couriers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد شركات شحن بعد' : 'No couriers yet'}
                </td>
              </tr>
            ) : null}
            {couriers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <Link
                    href={`/admin/couriers/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {isAr ? c.nameAr : c.nameEn}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? c.nameEn : c.nameAr}
                  </div>
                </td>
                <td className="p-3" dir="ltr">
                  {c.phone ?? '—'}
                </td>
                <td className="p-3">{c.position}</td>
                <td className="p-3">{c._count.orders}</td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      c.active
                        ? 'bg-success-soft text-success'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {c.active
                      ? isAr
                        ? 'نشط'
                        : 'Active'
                      : isAr
                        ? 'غير نشط'
                        : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <CourierRowActions
                    id={c.id}
                    active={c.active}
                    hasDependents={c._count.orders > 0}
                    labels={{
                      activate: isAr ? 'تنشيط' : 'Activate',
                      deactivate: isAr ? 'إلغاء التنشيط' : 'Deactivate',
                      delete: isAr ? 'حذف' : 'Delete',
                      confirmDelete: isAr
                        ? 'هل تريد حذف شركة الشحن هذه نهائياً؟'
                        : 'Delete this courier permanently?',
                      hasDependentsHelp: isAr
                        ? 'يوجد طلبات مرتبطة بهذه الشركة — ألغِ التنشيط بدلاً من الحذف'
                        : 'Orders reference this courier — deactivate instead of deleting',
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
