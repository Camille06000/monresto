import { NavLink } from 'react-router-dom';
import { BarChart3, ShoppingBag, ShoppingCart, Package, UtensilsCrossed, FileText, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import clsx from 'clsx';

const items = [
  { to: '/', icon: BarChart3, key: 'dashboard' },
  { to: '/purchases', icon: ShoppingBag, key: 'purchases' },
  { to: '/sales', icon: ShoppingCart, key: 'sales' },
  { to: '/stock', icon: Package, key: 'stock' },
  { to: '/daily-report', icon: FileText, key: 'dailyReport' },
];

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0b1220]/90 backdrop-blur-xl border-t border-white/10">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center py-3 text-xs',
                  isActive ? 'text-primary' : 'text-gray-300',
                )
              }
            >
              <Icon size={20} />
              <span className="mt-1 truncate px-1">{t(`nav.${item.key}`)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
