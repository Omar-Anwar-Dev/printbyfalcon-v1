import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AdminUserEditForm } from '@/components/admin/admin-user-edit-form';

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const actor = await requireAdmin(['OWNER']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      type: true,
    },
  });
  if (!user || user.type !== 'ADMIN') notFound();

  const isSelf = user.id === actor.id;

  return (
    <div className="container max-w-2xl py-8">
      <Link
        href="/admin/users"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'قائمة المستخدمين' : 'Back to users'}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">{user.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground" dir="ltr">
        {user.email}
      </p>

      <section className="mb-8 rounded-md border bg-background p-5">
        <h2 className="mb-4 text-lg font-semibold">
          {isAr ? 'الدور' : 'Role'}
        </h2>
        {isSelf ? (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            {isAr
              ? 'لا يمكن تعديل دورك الشخصي. اطلب من مالك آخر لو محتاج تغيير.'
              : 'You cannot change your own role. Ask another owner if you need it changed.'}
          </p>
        ) : (
          <AdminUserEditForm
            userId={user.id}
            currentRole={user.adminRole ?? 'OPS'}
            isAr={isAr}
          />
        )}
      </section>

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-2 text-lg font-semibold">
          {isAr ? 'معلومات الحساب' : 'Account info'}
        </h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {isAr ? 'الحالة' : 'Status'}
          </dt>
          <dd>
            {user.status === 'ACTIVE' ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {isAr ? 'نشط' : 'Active'}
              </span>
            ) : (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {isAr ? 'معطّل' : 'Deactivated'}
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">
            {isAr ? 'آخر تسجيل دخول' : 'Last sign-in'}
          </dt>
          <dd>
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString(
                  isAr ? 'ar-EG' : 'en-US',
                  { dateStyle: 'short', timeStyle: 'short' },
                )
              : '—'}
          </dd>
          <dt className="text-muted-foreground">
            {isAr ? 'تاريخ الإنشاء' : 'Created at'}
          </dt>
          <dd>
            {new Date(user.createdAt).toLocaleDateString(
              isAr ? 'ar-EG' : 'en-US',
              { dateStyle: 'medium' },
            )}
          </dd>
        </dl>
      </section>
    </div>
  );
}
