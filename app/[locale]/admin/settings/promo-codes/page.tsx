import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { PromoBulkDisable } from '@/components/admin/promo-bulk-disable';

export const dynamic = 'force-dynamic';

export default async function PromoCodesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const { q } = await searchParams;
  const isAr = locale === 'ar';

  const search = q?.trim().toUpperCase() ?? '';
  const rows = await prisma.promoCode.findMany({
    where: search ? { code: { contains: search } } : undefined,
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'أكواد الخصم' : 'Promo codes'}
        </h1>
        <div className="flex items-center gap-2">
          <PromoBulkDisable locale={isAr ? 'ar' : 'en'} />
          <Link
            href="/admin/settings/promo-codes/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {isAr ? 'إنشاء كود جديد' : 'New code'}
          </Link>
        </div>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={isAr ? 'بحث بالكود…' : 'Search by code…'}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          {isAr ? 'بحث' : 'Search'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-start">{isAr ? 'الكود' : 'Code'}</th>
              <th className="p-2 text-start">{isAr ? 'النوع' : 'Type'}</th>
              <th className="p-2 text-start">{isAr ? 'القيمة' : 'Value'}</th>
              <th className="p-2 text-start">{isAr ? 'الاستخدام' : 'Usage'}</th>
              <th className="p-2 text-start">
                {isAr ? 'صلاحية حتى' : 'Valid to'}
              </th>
              <th className="p-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد نتائج.' : 'No promo codes yet.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono">
                    <Link
                      href={`/admin/settings/promo-codes/${r.id}`}
                      className="underline hover:no-underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">
                    {r.type === 'PERCENT'
                      ? `${Number(r.value)}%`
                      : `${Number(r.value).toLocaleString()} ج.م`}
                  </td>
                  <td className="p-2">
                    {r.usedCount} / {r.usageLimit ?? '∞'}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {r.validTo
                      ? new Date(r.validTo).toISOString().slice(0, 10)
                      : '—'}
                  </td>
                  <td className="p-2">
                    {r.active ? (
                      <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs text-success dark:bg-success/40 dark:text-success">
                        {isAr ? 'مفعّل' : 'Active'}
                      </span>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {isAr ? 'مُعطّل' : 'Inactive'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
