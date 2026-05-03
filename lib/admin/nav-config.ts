import type { AdminRole } from '@prisma/client';

export type AdminNavIconName =
  | 'dashboard'
  | 'package'
  | 'tag'
  | 'folder-tree'
  | 'printer'
  | 'shopping-cart'
  | 'truck'
  | 'boxes'
  | 'users'
  | 'rotate-ccw'
  | 'building-2'
  | 'clipboard-check'
  | 'building'
  | 'user-cog'
  | 'settings'
  | 'message-square';

export type AdminNavLink = {
  href: string;
  label: string;
  icon: AdminNavIconName;
};

export type AdminNavGroup = {
  /** Empty string for the leading "no-heading" group (Dashboard). */
  heading: string;
  links: AdminNavLink[];
};

const all: readonly AdminRole[] = ['OWNER', 'OPS', 'SALES_REP'];
const ownerOps: readonly AdminRole[] = ['OWNER', 'OPS'];
const ownerSales: readonly AdminRole[] = ['OWNER', 'SALES_REP'];
const ownerOnly: readonly AdminRole[] = ['OWNER'];

type NavLabels = {
  dashboard: string;
  products: string;
  brands: string;
  categories: string;
  printerModels: string;
  orders: string;
  returns: string;
  couriers: string;
  inventory: string;
  customers: string;
  feedback: string;
  b2bApplications: string;
  b2bPendingConfirmation: string;
  b2bCompanies: string;
  users: string;
  settings: string;
  groupCatalog: string;
  groupOrders: string;
  groupCustomers: string;
  groupB2B: string;
  groupAdmin: string;
};

/**
 * Returns the admin nav grouped + filtered for the current user's role.
 * Pure data — no JSX. Consumed by both the desktop sidebar and the
 * mobile drawer client components.
 */
export function getAdminNavGroups(
  role: AdminRole | null,
  labels: NavLabels,
): AdminNavGroup[] {
  if (!role) return [];

  type RawLink = AdminNavLink & { roles: readonly AdminRole[] };
  type RawGroup = { heading: string; links: RawLink[] };

  const groups: RawGroup[] = [
    {
      heading: '',
      links: [
        {
          href: '/admin',
          label: labels.dashboard,
          icon: 'dashboard',
          roles: all,
        },
      ],
    },
    {
      heading: labels.groupCatalog,
      links: [
        {
          href: '/admin/products',
          label: labels.products,
          icon: 'package',
          roles: ownerOps,
        },
        {
          href: '/admin/brands',
          label: labels.brands,
          icon: 'tag',
          roles: ownerOps,
        },
        {
          href: '/admin/categories',
          label: labels.categories,
          icon: 'folder-tree',
          roles: ownerOps,
        },
        {
          href: '/admin/printer-models',
          label: labels.printerModels,
          icon: 'printer',
          roles: ownerOps,
        },
      ],
    },
    {
      heading: labels.groupOrders,
      links: [
        {
          href: '/admin/orders',
          label: labels.orders,
          icon: 'shopping-cart',
          roles: ownerOps,
        },
        {
          href: '/admin/orders/returns',
          label: labels.returns,
          icon: 'rotate-ccw',
          roles: ownerOps,
        },
        {
          href: '/admin/couriers',
          label: labels.couriers,
          icon: 'truck',
          roles: ownerOps,
        },
        {
          href: '/admin/inventory',
          label: labels.inventory,
          icon: 'boxes',
          roles: ownerOps,
        },
      ],
    },
    {
      heading: labels.groupCustomers,
      links: [
        {
          href: '/admin/customers',
          label: labels.customers,
          icon: 'users',
          roles: ownerSales,
        },
        {
          href: '/admin/feedback',
          label: labels.feedback,
          icon: 'message-square',
          roles: ownerOps,
        },
      ],
    },
    {
      heading: labels.groupB2B,
      links: [
        {
          href: '/admin/b2b/applications',
          label: labels.b2bApplications,
          icon: 'building-2',
          roles: ownerSales,
        },
        {
          href: '/admin/b2b/pending-confirmation',
          label: labels.b2bPendingConfirmation,
          icon: 'clipboard-check',
          roles: ownerSales,
        },
        {
          href: '/admin/b2b/companies',
          label: labels.b2bCompanies,
          icon: 'building',
          roles: ownerSales,
        },
      ],
    },
    {
      heading: labels.groupAdmin,
      links: [
        {
          href: '/admin/users',
          label: labels.users,
          icon: 'user-cog',
          roles: ownerOnly,
        },
        {
          href: '/admin/settings',
          label: labels.settings,
          icon: 'settings',
          roles: ownerOnly,
        },
      ],
    },
  ];

  return groups
    .map((g) => ({
      heading: g.heading,
      links: g.links
        .filter((l) => l.roles.includes(role))
        .map(({ roles: _roles, ...l }) => l),
    }))
    .filter((g) => g.links.length > 0);
}
