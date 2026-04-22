import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { getOptionalUser } from '@/lib/auth';
import type { AdminRole } from '@prisma/client';

type NavLink = {
  href: string;
  label: string;
  roles: readonly AdminRole[];
};

export async function AdminNav() {
  const t = await getTranslations('admin.nav');
  const user = await getOptionalUser();
  const role: AdminRole | null =
    user?.type === 'ADMIN' ? (user.adminRole ?? null) : null;

  const all: readonly AdminRole[] = ['OWNER', 'OPS', 'SALES_REP'];
  const ownerOps: readonly AdminRole[] = ['OWNER', 'OPS'];
  const ownerSales: readonly AdminRole[] = ['OWNER', 'SALES_REP'];
  const ownerOnly: readonly AdminRole[] = ['OWNER'];

  const links: NavLink[] = [
    { href: '/admin', label: t('dashboard'), roles: all },
    { href: '/admin/products', label: t('products'), roles: ownerOps },
    { href: '/admin/brands', label: t('brands'), roles: ownerOps },
    { href: '/admin/categories', label: t('categories'), roles: ownerOps },
    {
      href: '/admin/printer-models',
      label: t('printerModels'),
      roles: ownerOps,
    },
    { href: '/admin/orders', label: t('orders'), roles: ownerOps },
    { href: '/admin/couriers', label: t('couriers'), roles: ownerOps },
    { href: '/admin/inventory', label: t('inventory'), roles: ownerOps },
    { href: '/admin/customers', label: t('customers'), roles: ownerSales },
    { href: '/admin/orders/returns', label: t('returns'), roles: ownerOps },
    {
      href: '/admin/b2b/applications',
      label: t('b2bApplications'),
      roles: ownerSales,
    },
    {
      href: '/admin/b2b/pending-confirmation',
      label: t('b2bPendingConfirmation'),
      roles: ownerSales,
    },
    {
      href: '/admin/b2b/companies',
      label: t('b2bCompanies'),
      roles: ownerSales,
    },
    { href: '/admin/users', label: t('users'), roles: ownerOnly },
    { href: '/admin/settings', label: t('settings'), roles: ownerOnly },
  ];

  const visible = role ? links.filter((l) => l.roles.includes(role)) : [];

  return (
    <nav className="flex flex-col gap-1 p-4 text-sm">
      {visible.map((link) => (
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
