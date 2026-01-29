import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Package,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Settings,
  LineChart,
  Database,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const links = [
  { to: '/', icon: BarChart3, key: 'dashboard' },
  { to: '/purchases', icon: ShoppingBag, key: 'purchases' },
  { to: '/sales', icon: ShoppingCart, key: 'sales' },
  { to: '/stock', icon: Package, key: 'stock' },
  { to: '/dishes', icon: UtensilsCrossed, key: 'dishes' },
  { to: '/products', icon: Database, key: 'products' },
  { to: '/analytics', icon: LineChart, key: 'analytics' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="hidden lg:flex h-screen sticky top-0 flex-col w-64 border-r border-white/10 bg-[#0b1220] px-4 py-6 gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition',
                isActive ? 'bg-primary/20 text-white border border-primary/30' : 'text-gray-300 hover:bg-white/5',
              )
            }
          >
            <Icon size={18} />
            <span>{t(`nav.${link.key}`)}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}
