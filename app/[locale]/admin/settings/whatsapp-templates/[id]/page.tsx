import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { WhatsappTemplateEditor } from '@/components/admin/whatsapp-template-editor';
import type { TemplateVariable } from '@/lib/whatsapp/templates-seed';

export const dynamic = 'force-dynamic';

export default async function AdminWhatsappTemplateDetail({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { id, locale } = await params;
  const isAr = locale === 'ar';

  const template = await prisma.whatsappTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  // `variables` is JSON in the DB; runtime-narrow to TemplateVariable[].
  const variables: TemplateVariable[] = Array.isArray(template.variables)
    ? (template.variables as unknown as TemplateVariable[])
    : [];

  return (
    <main className="container-page max-w-5xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإعدادات' : 'Settings'}
        title={isAr ? template.nameAr : template.nameEn}
        subtitle={
          <Link
            href="/admin/settings/whatsapp-templates"
            className="text-accent-strong hover:underline"
          >
            {isAr ? '← الرجوع للقائمة' : '← Back to templates'}
          </Link>
        }
      />

      <div className="mb-6 rounded-md border border-border bg-paper p-4 text-sm">
        <p className="font-medium text-foreground">
          {isAr ? 'متى تُرسل هذه الرسالة؟' : 'When is this message sent?'}
        </p>
        <p className="mt-1 text-muted-foreground">
          {isAr ? template.descriptionAr : template.descriptionEn}
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          key: {template.key}
        </p>
      </div>

      <WhatsappTemplateEditor
        id={template.id}
        initialBodyAr={template.bodyAr}
        initialBodyEn={template.bodyEn}
        initialIsActive={template.isActive}
        variables={variables}
        isAr={isAr}
      />
    </main>
  );
}
