import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  ShoppingBag,
  ShoppingCart,
  Package,
  FileText,
  Menu,
  X,
  UtensilsCrossed,
  Database,
  Wallet,
  LineChart,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const mainItems = [
  { to: '/', icon: BarChart3, key: 'dashboard' },
  { to: '/purchases', icon: ShoppingBag, key: 'purchases' },
  { to: '/sales', icon: ShoppingCart, key: 'sales' },
  { to: '/stock', icon: Package, key: 'stock' },
];

const allItems = [
  { to: '/', icon: BarChart3, key: 'dashboard' },
  { to: '/purchases', icon: ShoppingBag, key: 'purchases' },
  { to: '/sales', icon: ShoppingCart, key: 'sales' },
  { to: '/stock', icon: Package, key: 'stock' },
  { to: '/dishes', icon: UtensilsCrossed, key: 'dishes' },
  { to: '/products', icon: Database, key: 'products' },
  { to: '/daily-report', icon: FileText, key: 'dailyReport' },
  { to: '/fixed-charges', icon: Wallet, key: 'fixedCharges' },
  { to: '/analytics', icon: LineChart, key: 'analytics' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-up menu */}
      <div
        className={clsx(
          'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b1220] border-t border-white/10 rounded-t-2xl transition-transform duration-300',
          menuOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Menu</h3>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 p-2">
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {allItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex flex-col items-center justify-center p-3 rounded-xl text-xs',
                      isActive ? 'bg-primary/20 text-primary' : 'text-gray-300 bg-white/5'
                    )
                  }
                >
                  <Icon size={22} />
                  <span className="mt-1 text-center leading-tight">{t(`nav.${item.key}`)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0b1220]/95 backdrop-blur-xl border-t border-white/10 safe-area-pb">
        <div className="grid grid-cols-5">
          {mainItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center justify-center py-2 text-[10px]',
                    isActive ? 'text-primary' : 'text-gray-400'
                  )
                }
              >
                <Icon size={20} />
                <span className="mt-0.5">{t(`nav.${item.key}`)}</span>
              </NavLink>
            );
          })}
          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center py-2 text-[10px] text-gray-400"
          >
            <Menu size={20} />
            <span className="mt-0.5">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
