import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function AdminNav() {
  const t = await getTranslations('admin.nav');
  const links: Array<{ href: string; label: string }> = [
    { href: '/admin', label: t('dashboard') },
    { href: '/admin/products', label: t('products') },
    { href: '/admin/brands', label: t('brands') },
    { href: '/admin/categories', label: t('categories') },
    { href: '/admin/printer-models', label: t('printerModels') },
    { href: '/admin/orders', label: t('orders') },
    { href: '/admin/couriers', label: t('couriers') },
    { href: '/admin/inventory', label: t('inventory') },
    { href: '/admin/b2b/applications', label: t('b2bApplications') },
    {
      href: '/admin/b2b/pending-confirmation',
      label: t('b2bPendingConfirmation'),
    },
    { href: '/admin/b2b/companies', label: t('b2bCompanies') },
    { href: '/admin/settings', label: t('settings') },
  ];
  return (
    <nav className="flex flex-col gap-1 p-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-3 py-2 transition-colors hover:bg-muted"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
