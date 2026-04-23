import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { CustomerContactForm } from '@/components/admin/customer-contact-form';
import { CustomerStatusToggle } from '@/components/admin/customer-status-toggle';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const actor = await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      languagePref: true,
      createdAt: true,
      lastLoginAt: true,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalEgp: true,
          createdAt: true,
        },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!user || user.type !== 'B2C') notFound();

  const isOwner = actor.adminRole === 'OWNER';

  return (
    <div className="container-page py-10 md:py-14">
      <Link
        href="/admin/customers"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'قائمة العملاء' : 'Back to customers'}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">{user.name}</h1>
          <p className="font-mono text-sm text-muted-foreground" dir="ltr">
            {user.phone}
            {user.email ? ` · ${user.email}` : ''}
          </p>
        </div>
        {user.status === 'ACTIVE' ? (
          <span className="rounded bg-success-soft px-3 py-1 text-xs font-medium text-success">
            {isAr ? 'نشط' : 'Active'}
          </span>
        ) : (
          <span className="rounded bg-error-soft px-3 py-1 text-xs font-medium text-error">
            {isAr ? 'معطّل' : 'Deactivated'}
          </span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-md border bg-background p-5">
          <h2 className="mb-3 text-lg font-semibold">
            {isAr ? 'بيانات الاتصال' : 'Contact info'}
          </h2>
          <CustomerContactForm
            userId={user.id}
            initialName={user.name}
            initialEmail={user.email ?? ''}
            phone={user.phone ?? ''}
            isAr={isAr}
          />
          {isOwner ? (
            <div className="mt-6 border-t pt-4">
              <CustomerStatusToggle
                userId={user.id}
                isActive={user.status === 'ACTIVE'}
                isAr={isAr}
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-md border bg-background p-5">
          <h2 className="mb-3 text-lg font-semibold">
            {isAr
              ? `العناوين (${user.addresses.length})`
              : `Addresses (${user.addresses.length})`}
          </h2>
          {user.addresses.length === 0 ? (
            <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
              {isAr ? 'لا يوجد عناوين' : 'No addresses'}
            </p>
          ) : (
            <ul className="space-y-3">
              {user.addresses.map((a) => (
                <li
                  key={a.id}
                  className="rounded border p-3 text-sm leading-relaxed"
                >
                  <div className="flex items-center justify-between">
                    <strong>{a.recipientName}</strong>
                    {a.isDefault ? (
                      <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        {isAr ? 'افتراضي' : 'Default'}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.governorate} · {a.city}
                    {a.area ? ` · ${a.area}` : ''}
                  </div>
                  <div className="text-xs">
                    {a.street}
                    {a.building ? ` · ${a.building}` : ''}
                    {a.apartment ? ` · ${a.apartment}` : ''}
                  </div>
                  <div className="font-mono text-xs" dir="ltr">
                    {a.phone}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-md border bg-background p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isAr
              ? `آخر الطلبات (${user._count.orders})`
              : `Recent orders (${user._count.orders})`}
          </h2>
        </div>
        {user.orders.length === 0 ? (
          <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
            {isAr ? 'لا توجد طلبات' : 'No orders yet'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-start">
                    {isAr ? 'رقم الطلب' : 'Order #'}
                  </th>
                  <th className="p-2 text-start">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th className="p-2 text-start">
                    {isAr ? 'الدفع' : 'Payment'}
                  </th>
                  <th className="p-2 text-start">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </th>
                  <th className="p-2 text-start">
                    {isAr ? 'التاريخ' : 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {user.orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="p-2">{o.status}</td>
                    <td className="p-2">{o.paymentStatus}</td>
                    <td className="p-2 tabular-nums">
                      {Number(o.totalEgp).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString(
                        isAr ? 'ar-EG' : 'en-US',
                        { dateStyle: 'short' },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
