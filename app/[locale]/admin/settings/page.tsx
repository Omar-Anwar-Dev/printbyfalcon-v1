import { requireAdmin } from '@/lib/auth';
import { Link } from '@/lib/i18n/routing';

export default async function AdminSettingsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const items: Array<{ href: string; title: string; desc: string }> = [
    {
      href: '/admin/settings/store',
      title: isAr ? 'بيانات المتجر والفاتورة' : 'Store & invoice info',
      desc: isAr
        ? 'الاسم التجاري، السجل التجاري، البطاقة الضريبية، العنوان والهاتف — تُطبع على الفواتير.'
        : 'Company name, commercial registry, tax card, address, phone — printed on invoices.',
    },
    {
      href: '/admin/settings/inventory',
      title: isAr ? 'حدود المخزون' : 'Inventory thresholds',
      desc: isAr
        ? 'الحد الافتراضي للمخزون المنخفض (يُطبَّق على المنتجات التي ليس لها تخصيص يدوي).'
        : 'Global low-stock threshold (applied to products without a per-SKU override).',
    },
    {
      href: '/admin/settings/notifications',
      title: isAr ? 'الإشعارات' : 'Notifications',
      desc: isAr
        ? 'تحكم في حالات الطلب التي تُرسل فيها إشعارات على كل قناة.'
        : 'Control which order statuses trigger customer notifications per channel.',
    },
  ];

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'الإعدادات' : 'Settings'}
      </h1>
      <div className="grid gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border bg-background p-4 transition-colors hover:bg-muted/50"
          >
            <div className="font-medium">{item.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
