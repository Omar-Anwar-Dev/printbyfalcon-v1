import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Prisma, UserStatus } from '@prisma/client';

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

const PAGE_SIZE = 30;

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';
  const q = (sp.q ?? '').trim();
  const statusFilter: UserStatus =
    sp.status === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const where: Prisma.UserWhereInput = {
    type: 'B2C',
    status: statusFilter,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'عملاء الأفراد (B2C)' : 'Individual customers (B2C)'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'قائمة عملاء B2C — ابحث بالاسم أو الهاتف أو البريد الإلكتروني. المالك يقدر يوقف حساب لو ضروري.'
          : 'B2C customer list — search by name, phone, or email. Owner can deactivate an account when needed.'}
      </p>

      <form className="mb-4 flex flex-wrap items-end gap-3" action="">
        <div className="min-w-[16rem] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            {isAr ? 'بحث' : 'Search'}
          </label>
          <Input
            name="q"
            defaultValue={q}
            placeholder={isAr ? 'اسم أو هاتف أو بريد' : 'Name, phone, or email'}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {isAr ? 'الحالة' : 'Status'}
          </label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ACTIVE">{isAr ? 'نشط' : 'Active'}</option>
            <option value="DEACTIVATED">
              {isAr ? 'معطّل' : 'Deactivated'}
            </option>
          </select>
        </div>
        <Button type="submit">{isAr ? 'تطبيق' : 'Apply'}</Button>
      </form>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="p-3 text-start">{isAr ? 'الهاتف' : 'Phone'}</th>
              <th className="p-3 text-start">{isAr ? 'البريد' : 'Email'}</th>
              <th className="p-3 text-start">
                {isAr ? 'عدد الطلبات' : 'Orders'}
              </th>
              <th className="p-3 text-start">
                {isAr ? 'تاريخ الإنشاء' : 'Created'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد نتائج' : 'No results'}
                </td>
              </tr>
            ) : null}
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  <Link
                    href={`/admin/customers/${u.id}`}
                    className="font-medium hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs" dir="ltr">
                  {u.phone ?? '—'}
                </td>
                <td className="p-3 font-mono text-xs" dir="ltr">
                  {u.email ?? '—'}
                </td>
                <td className="p-3 tabular-nums">{u._count.orders}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString(
                    isAr ? 'ar-EG' : 'en-US',
                    { dateStyle: 'short' },
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-between text-sm"
          aria-label={isAr ? 'الترقيم' : 'Pagination'}
        >
          <span className="text-muted-foreground">
            {isAr
              ? `صفحة ${page} من ${totalPages} — إجمالي ${total}`
              : `Page ${page} of ${totalPages} — ${total} total`}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={{
                  pathname: '/admin/customers',
                  query: { q, status: statusFilter, page: String(page - 1) },
                }}
                className="rounded-md border px-3 py-1 hover:bg-muted"
              >
                {isAr ? 'السابق' : 'Prev'}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={{
                  pathname: '/admin/customers',
                  query: { q, status: statusFilter, page: String(page + 1) },
                }}
                className="rounded-md border px-3 py-1 hover:bg-muted"
              >
                {isAr ? 'التالي' : 'Next'}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
