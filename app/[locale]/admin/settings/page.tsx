import { ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { Link } from '@/lib/i18n/routing';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

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
      href: '/admin/settings/returns',
      title: isAr ? 'سياسة الاسترجاع' : 'Return policy',
      desc: isAr
        ? 'نافذة الاسترجاع، الحد الأدنى للطلب، والصلاحيات المسموح لها بتجاوز السياسة.'
        : 'Return window, minimum order value, and roles allowed to override.',
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
    {
      href: '/admin/settings/whatsapp-templates',
      title: isAr ? 'قوالب رسائل واتساب' : 'WhatsApp message templates',
      desc: isAr
        ? 'تعديل صياغة رسائل واتساب التي تُرسل للعملاء (تأكيد الطلب، التسليم للشحن، إلخ).'
        : 'Edit the wording of WhatsApp messages sent to customers (order confirmed, handed to courier, etc.).',
    },
  ];

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الإدارة' : 'Admin'}
        title={isAr ? 'الإعدادات' : 'Settings'}
        subtitle={
          isAr
            ? 'تحكّم في الشحن، الدفع، الضريبة، الإشعارات، الاسترجاع، والإعدادات العامة للمتجر.'
            : 'Shipping, payment, VAT, notifications, returns, and global store config.'
        }
      />
      <div className="grid gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-paper p-5 transition-colors hover:border-accent/40 hover:bg-paper-hover"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight
              className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
