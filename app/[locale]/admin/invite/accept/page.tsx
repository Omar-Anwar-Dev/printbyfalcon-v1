import { prisma } from '@/lib/db';
import { sha256Hex } from '@/lib/crypto';
import { AdminInviteAcceptForm } from '@/components/admin/admin-invite-accept-form';

export default async function AdminInviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  const isAr = locale === 'ar';

  if (!token) {
    return (
      <ErrorCard
        isAr={isAr}
        message={isAr ? 'رابط غير صالح.' : 'Invalid link.'}
      />
    );
  }

  const invite = await prisma.adminInvite.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      email: true,
      role: true,
      acceptedAt: true,
      expiresAt: true,
    },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <ErrorCard
        isAr={isAr}
        message={
          isAr
            ? 'الدعوة غير صالحة أو منتهية الصلاحية. اطلب من المالك إرسال دعوة جديدة.'
            : 'This invitation is invalid or expired. Ask the owner to send a new one.'
        }
      />
    );
  }

  const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
    OWNER: { ar: 'مالك', en: 'Owner' },
    OPS: { ar: 'عمليات', en: 'Ops' },
    SALES_REP: { ar: 'مبيعات', en: 'Sales Rep' },
  };
  const roleLabel = ROLE_LABEL[invite.role];

  return (
    <main className="container-page max-w-md py-12">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'إتمام تفعيل حسابك' : 'Finish setting up your account'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? `أنت مدعو للانضمام كـ "${roleLabel.ar}" على ${invite.email}. اختر اسمك وكلمة مرور لتفعيل الحساب.`
          : `You're invited to join as "${roleLabel.en}" on ${invite.email}. Pick your name and a password to activate.`}
      </p>
      <AdminInviteAcceptForm token={token} isAr={isAr} />
    </main>
  );
}

function ErrorCard({ isAr, message }: { isAr: boolean; message: string }) {
  return (
    <main className="container-page max-w-md py-12">
      <div className="rounded-md border border-destructive bg-destructive/5 p-6">
        <h1 className="mb-2 text-lg font-semibold text-destructive">
          {isAr ? 'خطأ' : 'Error'}
        </h1>
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
