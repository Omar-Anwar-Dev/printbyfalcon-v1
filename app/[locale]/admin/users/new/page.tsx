import { requireAdmin } from '@/lib/auth';
import { AdminInviteForm } from '@/components/admin/admin-invite-form';
import { Link } from '@/lib/i18n/routing';

export default async function AdminUserInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="container-page py-10 md:py-14">
      <Link
        href="/admin/users"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'قائمة المستخدمين' : 'Back to users'}
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'دعوة مستخدم جديد' : 'Invite a new user'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'يتم إرسال رسالة بريد إلكتروني إلى المستخدم عليها رابط صالح لمدة 48 ساعة. المستخدم يختار كلمة المرور بنفسه عند القبول.'
          : 'We send the user an email with a one-time link valid for 48 hours. They set their own password on acceptance.'}
      </p>
      <AdminInviteForm isAr={isAr} />
    </div>
  );
}
