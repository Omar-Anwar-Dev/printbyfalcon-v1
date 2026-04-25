import {
  LayoutDashboard,
  Package,
  Tag,
  FolderTree,
  Printer,
  ShoppingCart,
  Truck,
  Boxes,
  Users,
  RotateCcw,
  Building2,
  ClipboardCheck,
  Building,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { AdminNavIconName } from '@/lib/admin/nav-config';

const iconMap: Record<AdminNavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  package: Package,
  tag: Tag,
  'folder-tree': FolderTree,
  printer: Printer,
  'shopping-cart': ShoppingCart,
  truck: Truck,
  boxes: Boxes,
  users: Users,
  'rotate-ccw': RotateCcw,
  'building-2': Building2,
  'clipboard-check': ClipboardCheck,
  building: Building,
  'user-cog': UserCog,
  settings: Settings,
};

/**
 * Renders a Lucide icon by name. Lets the nav-config payload travel
 * server → client without serializing icon components.
 */
export function AdminNavIcon({
  name,
  className,
}: {
  name: AdminNavIconName;
  className?: string;
}) {
  const Icon = iconMap[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
