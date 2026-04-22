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
        ? 'الاسم التجاري، الشعار، السجل التجاري، البطاقة الضريبية، العنوان، الهاتف — تُطبع على الفواتير.'
        : 'Company name, logo, commercial registry, tax card, address, phone — printed on invoices.',
    },
    {
      href: '/admin/settings/shipping',
      title: isAr ? 'الشحن والمحافظات' : 'Shipping & governorates',
      desc: isAr
        ? 'أسعار الشحن لكل منطقة، حدود الشحن المجاني، وربط المحافظات بالمناطق.'
        : 'Per-zone shipping rates, free-shipping thresholds, governorate-to-zone mapping.',
    },
    {
      href: '/admin/settings/cod',
      title: isAr ? 'الدفع عند الاستلام' : 'Cash on delivery',
      desc: isAr
        ? 'تفعيل الدفع عند الاستلام، الرسوم، الحد الأقصى للطلب، والتوفر حسب المنطقة.'
        : 'COD enable/disable, fee, max order value, per-zone availability.',
    },
    {
      href: '/admin/settings/vat',
      title: isAr ? 'ضريبة القيمة المضافة' : 'VAT',
      desc: isAr
        ? 'نسبة الضريبة الافتراضية (14%) والمنتجات المُعفاة.'
        : 'Default VAT rate (14%) and tax-exempt product list.',
    },
    {
      href: '/admin/settings/promo-codes',
      title: isAr ? 'أكواد الخصم' : 'Promo codes',
      desc: isAr
        ? 'إنشاء وإدارة أكواد الخصم المستخدمة عند إتمام الطلب.'
        : 'Create and manage discount codes applied at checkout.',
    },
    {
      href: '/admin/couriers',
      title: isAr ? 'شركاء التوصيل' : 'Courier partners',
      desc: isAr
        ? 'قائمة شركات التوصيل المستخدمة عند تسليم الطلبات للمندوبين.'
        : 'Courier partner list used on order hand-off.',
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
