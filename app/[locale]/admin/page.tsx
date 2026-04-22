import { requireAdmin } from '@/lib/auth';
import { Link } from '@/lib/i18n/routing';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { listLowStockProducts } from '@/lib/inventory/low-stock';
import { canSeeWidget } from '@/lib/admin/role-matrix';
import {
  getDashboardCounts,
  getOldestPendingB2BHours,
  getSalesMonth,
  getSalesToday,
  getSalesTrend30d,
  getSalesWeek,
  getTopCustomersThisMonth,
  getTopProductsThisMonth,
} from '@/lib/admin/dashboard';
import { SalesTrendChart } from '@/components/admin/sales-trend-chart';

export const revalidate = 300; // 5-min cache for dashboard widgets (S10-D5-T2).

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const user = await requireAdmin();
  const { locale } = await params;
  const isAr = locale === 'ar';
  const role = user.adminRole ?? null;

  // Gate each widget behind the role matrix — do NOT load data we won't render.
  const [
    counts,
    salesToday,
    salesWeek,
    salesMonth,
    salesTrend,
    topProducts,
    topCustomers,
    lowStock,
    oldestPendingB2BHours,
  ] = await Promise.all([
    getDashboardCounts(),
    canSeeWidget(role, 'salesToday') ? getSalesToday() : Promise.resolve(null),
    canSeeWidget(role, 'salesWeek') ? getSalesWeek() : Promise.resolve(null),
    canSeeWidget(role, 'salesMonth') ? getSalesMonth() : Promise.resolve(null),
    canSeeWidget(role, 'salesTrend') ? getSalesTrend30d() : Promise.resolve([]),
    canSeeWidget(role, 'topProducts')
      ? getTopProductsThisMonth()
      : Promise.resolve([]),
    canSeeWidget(role, 'topCustomers')
      ? getTopCustomersThisMonth()
      : Promise.resolve([]),
    canSeeWidget(role, 'lowStock')
      ? listLowStockProducts(20)
      : Promise.resolve([]),
    canSeeWidget(role, 'b2bPendingConfirmation')
      ? getOldestPendingB2BHours()
      : Promise.resolve(null),
  ]);

  const currencyFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isAr ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <span className="text-sm text-muted-foreground">
          {isAr ? 'مرحبًا' : 'Welcome'}, <strong>{user.name}</strong>
          <span className="ms-1 rounded bg-muted px-2 py-0.5 text-xs">
            {user.adminRole}
          </span>
        </span>
      </div>

      {/* Revenue row — Owner only. */}
      {salesToday || salesWeek || salesMonth ? (
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {salesToday ? (
            <SalesCard
              title={isAr ? 'مبيعات اليوم' : 'Sales today'}
              data={salesToday}
              fmt={currencyFmt}
              isAr={isAr}
            />
          ) : null}
          {salesWeek ? (
            <SalesCard
              title={isAr ? 'آخر 7 أيام' : 'Last 7 days'}
              data={salesWeek}
              fmt={currencyFmt}
              isAr={isAr}
            />
          ) : null}
          {salesMonth ? (
            <SalesCard
              title={isAr ? 'الشهر الحالي' : 'This month'}
              data={salesMonth}
              fmt={currencyFmt}
              isAr={isAr}
            />
          ) : null}
        </section>
      ) : null}

      {/* Queues row — per-role visibility. */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canSeeWidget(role, 'newOrders') ? (
          <QueueCard
            href="/admin/orders"
            label={isAr ? 'طلبات جديدة تنتظر' : 'New orders awaiting'}
            count={counts.newOrdersAwaitingAction}
            hint={
              isAr
                ? 'طلبات CONFIRMED لم تُسلَّم بعد.'
                : 'Confirmed orders not yet handed over.'
            }
          />
        ) : null}
        {canSeeWidget(role, 'b2bPendingConfirmation') ? (
          <QueueCard
            href="/admin/b2b/pending-confirmation"
            label={isAr ? 'بانتظار تأكيد المبيعات' : 'Pending confirmation'}
            count={counts.pendingConfirmation}
            hint={
              oldestPendingB2BHours && oldestPendingB2BHours > 0
                ? isAr
                  ? `أقدم طلب: ${oldestPendingB2BHours} ساعة`
                  : `Oldest: ${oldestPendingB2BHours}h`
                : isAr
                  ? 'طلبات B2B "إرسال للمراجعة"'
                  : 'B2B Submit-for-Review orders'
            }
            urgent={Boolean(
              oldestPendingB2BHours && oldestPendingB2BHours >= 24,
            )}
          />
        ) : null}
        {canSeeWidget(role, 'b2bPendingApplications') ? (
          <QueueCard
            href="/admin/b2b/applications"
            label={isAr ? 'طلبات تسجيل B2B' : 'B2B applications'}
            count={counts.pendingB2BApplications}
            hint={
              isAr ? 'تحقق من المستندات ثم اعتمد' : 'Verify docs and approve'
            }
          />
        ) : null}
        {canSeeWidget(role, 'returnsPending') ? (
          <QueueCard
            href="/admin/orders/returns?decision=PENDING"
            label={isAr ? 'إرجاعات قيد المراجعة' : 'Returns pending'}
            count={counts.returnsPending}
            hint={
              isAr
                ? 'قرارات استرداد تنتظر الحسم'
                : 'Refund decisions awaiting review'
            }
          />
        ) : null}
      </section>

      {/* Sales trend chart — Owner only. */}
      {canSeeWidget(role, 'salesTrend') && salesTrend.length > 0 ? (
        <section className="mb-6 rounded-md border bg-background p-5">
          <SalesTrendChart points={salesTrend} isAr={isAr} />
        </section>
      ) : null}

      {/* Two-column: Top products + Top customers (when owner) / low-stock. */}
      <div className="grid gap-4 md:grid-cols-2">
        {canSeeWidget(role, 'topProducts') ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {isAr
                  ? 'أعلى 10 منتجات هذا الشهر'
                  : 'Top 10 products (this month)'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'بناءً على الكمية المباعة' : 'By units sold'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? 'لا توجد مبيعات هذا الشهر بعد.'
                    : 'No sales this month yet.'}
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {topProducts.map((p, idx) => (
                    <li
                      key={p.sku}
                      className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <span className="font-medium">
                          {isAr ? p.nameAr : p.nameEn}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {p.unitsSold}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canSeeWidget(role, 'topCustomers') ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {isAr
                  ? 'أعلى 10 عملاء هذا الشهر'
                  : 'Top 10 customers (this month)'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'بناءً على قيمة المشتريات' : 'By revenue'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? 'لا توجد مبيعات هذا الشهر بعد.'
                    : 'No sales this month yet.'}
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {topCustomers.map((c, idx) => (
                    <li
                      key={c.userId}
                      className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <Link
                          href={
                            c.type === 'B2C'
                              ? `/admin/customers/${c.userId}`
                              : `/admin/b2b/companies`
                          }
                          className="truncate font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                          {c.type}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {currencyFmt.format(c.totalEgp)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Low-stock table — OWNER + OPS. */}
      {canSeeWidget(role, 'lowStock') ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {isAr ? 'تنبيهات المخزون المنخفض' : 'Low-stock alerts'}{' '}
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                ({lowStock.length})
              </span>
            </CardTitle>
            <CardDescription>
              {isAr
                ? 'المنتجات التي رصيدها على حد التنبيه أو أقل.'
                : 'Products at or below their effective threshold.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? 'لا توجد تنبيهات — كل شيء على ما يرام.'
                  : 'No alerts — inventory looks healthy.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-start">
                        {isAr ? 'الكود' : 'SKU'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'المنتج' : 'Product'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'المتاح' : 'Available'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'حد التنبيه' : 'Threshold'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((row) => (
                      <tr key={row.productId} className="border-t">
                        <td className="py-2 font-mono text-xs">{row.sku}</td>
                        <td className="py-2">
                          <Link
                            href={`/admin/inventory/${row.productId}`}
                            className="font-medium hover:underline"
                          >
                            {isAr ? row.nameAr : row.nameEn}
                          </Link>
                        </td>
                        <td
                          className={`py-2 font-medium tabular-nums ${
                            row.currentQty <= 0
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {row.currentQty}
                        </td>
                        <td className="py-2 tabular-nums">
                          {row.effectiveThreshold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SalesCard({
  title,
  data,
  fmt,
  isAr,
}: {
  title: string;
  data: { currentEgp: number; priorEgp: number; deltaPct: number | null };
  fmt: Intl.NumberFormat;
  isAr: boolean;
}) {
  const deltaColor =
    data.deltaPct === null
      ? 'text-muted-foreground'
      : data.deltaPct >= 0
        ? 'text-green-700'
        : 'text-destructive';
  const deltaText =
    data.deltaPct === null
      ? isAr
        ? 'لا مقارنة (كانت ٠)'
        : 'No prior baseline'
      : `${data.deltaPct >= 0 ? '+' : ''}${data.deltaPct.toFixed(1)}%`;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {fmt.format(data.currentEgp)}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            {isAr ? 'ج.م' : 'EGP'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xs ${deltaColor}`}>
          {deltaText}
          <span className="ms-1 text-muted-foreground">
            {isAr ? 'عن الفترة السابقة' : 'vs prior period'}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  href,
  label,
  count,
  hint,
  urgent = false,
}: {
  href: string;
  label: string;
  count: number;
  hint: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-lg border-2 p-5 transition-colors ${
        urgent
          ? 'border-destructive/50 bg-destructive/5 hover:border-destructive/70'
          : 'border-primary/20 bg-primary/5 hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{count}</p>
          <p
            className={`mt-1 text-xs ${
              urgent
                ? 'font-semibold text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {hint}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground group-hover:bg-muted/80">
          →
        </span>
      </div>
    </Link>
  );
}
