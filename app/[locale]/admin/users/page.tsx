import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { AdminInviteRowActions } from '@/components/admin/admin-invite-row-actions';
import { AdminUserRowActions } from '@/components/admin/admin-user-row-actions';

const ROLE_LABEL_AR = {
  OWNER: 'مالك',
  OPS: 'عمليات',
  SALES_REP: 'مبيعات',
} as const;
const ROLE_LABEL_EN = {
  OWNER: 'Owner',
  OPS: 'Ops',
  SALES_REP: 'Sales Rep',
} as const;

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const actor = await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [admins, invites] = await Promise.all([
    prisma.user.findMany({
      where: { type: 'ADMIN' },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        adminRole: true,
        status: true,
        lastLoginAt: true,
      },
    }),
    prisma.adminInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const inviterNameById = new Map<string, string>();
  if (invites.length > 0) {
    const inviters = await prisma.user.findMany({
      where: { id: { in: invites.map((i) => i.invitedById) } },
      select: { id: true, name: true },
    });
    for (const u of inviters) inviterNameById.set(u.id, u.name);
  }

  const now = Date.now();
  const roleLabels = isAr ? ROLE_LABEL_AR : ROLE_LABEL_EN;

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'مستخدمو لوحة الإدارة' : 'Admin users'}
        </h1>
        <Button asChild>
          <Link href="/admin/users/new">
            + {isAr ? 'دعوة مستخدم' : 'Invite user'}
          </Link>
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'يقدر المالك يدعو مستخدمين جدد (بريد إلكتروني + دور)، يعدّل دورهم، أو يوقف حسابهم. الحسابات المعطّلة ما تقدرش تسجل دخول. كل تغيير يتحفظ في سجل التدقيق.'
          : 'Owner can invite new admins (email + role), change their role, or deactivate them. Deactivated accounts cannot sign in. Every change is recorded in the audit log.'}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? 'المستخدمون الحاليون' : 'Active users'}
        </h2>
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
                <th className="p-3 text-start">{isAr ? 'البريد' : 'Email'}</th>
                <th className="p-3 text-start">{isAr ? 'الدور' : 'Role'}</th>
                <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-start">
                  {isAr ? 'آخر دخول' : 'Last sign-in'}
                </th>
                <th className="p-3 text-end">
                  {isAr ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isSelf = a.id === actor.id;
                const lastLogin = a.lastLoginAt
                  ? new Date(a.lastLoginAt).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                      { dateStyle: 'short', timeStyle: 'short' },
                    )
                  : '—';
                return (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">
                      <Link
                        href={`/admin/users/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      {isSelf ? (
                        <span className="ms-2 rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                          {isAr ? 'أنت' : 'You'}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-xs" dir="ltr">
                      {a.email ?? '—'}
                    </td>
                    <td className="p-3">
                      {a.adminRole ? roleLabels[a.adminRole] : '—'}
                    </td>
                    <td className="p-3">
                      {a.status === 'ACTIVE' ? (
                        <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                          {isAr ? 'نشط' : 'Active'}
                        </span>
                      ) : (
                        <span className="rounded bg-error-soft px-2 py-0.5 text-xs font-medium text-error">
                          {isAr ? 'معطّل' : 'Deactivated'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {lastLogin}
                    </td>
                    <td className="p-3 text-end">
                      <AdminUserRowActions
                        userId={a.id}
                        isSelf={isSelf}
                        isActive={a.status === 'ACTIVE'}
                        isAr={isAr}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? 'دعوات معلّقة' : 'Pending invites'}
        </h2>
        {invites.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {isAr ? 'لا توجد دعوات معلّقة' : 'No pending invites'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-start">
                    {isAr ? 'البريد' : 'Email'}
                  </th>
                  <th className="p-3 text-start">{isAr ? 'الدور' : 'Role'}</th>
                  <th className="p-3 text-start">
                    {isAr ? 'دُعي بواسطة' : 'Invited by'}
                  </th>
                  <th className="p-3 text-start">
                    {isAr ? 'تنتهي في' : 'Expires'}
                  </th>
                  <th className="p-3 text-end">
                    {isAr ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const expired = inv.expiresAt.getTime() < now;
                  const expiresIn = expired
                    ? isAr
                      ? 'منتهية'
                      : 'Expired'
                    : new Date(inv.expiresAt).toLocaleDateString(
                        isAr ? 'ar-EG' : 'en-US',
                        { dateStyle: 'short' },
                      );
                  return (
                    <tr key={inv.id} className="border-t">
                      <td className="p-3 font-mono text-xs" dir="ltr">
                        {inv.email}
                      </td>
                      <td className="p-3">{roleLabels[inv.role]}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {inviterNameById.get(inv.invitedById) ?? '—'}
                      </td>
                      <td
                        className={`p-3 text-xs ${
                          expired ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        {expiresIn}
                      </td>
                      <td className="p-3 text-end">
                        <AdminInviteRowActions id={inv.id} isAr={isAr} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
