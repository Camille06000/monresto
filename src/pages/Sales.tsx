import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Minus, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDishes } from '../hooks/useDishes';
import { useSales, InsufficientStockError } from '../hooks/useSales';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';

interface CartItem {
  dish_id: string;
  name: string;
  price: number;
  quantity: number;
}

export function Sales() {
  const { t } = useTranslation();
  const { language } = useStore();
  const { dishes } = useDishes();
  const { create } = useSales();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const filtered = useMemo(
    () =>
      (dishes.data ?? []).filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) || (d.name_en ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [dishes.data, search],
  );

  const addToCart = (dishId: string, name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.dish_id === dishId);
      if (existing) {
        return prev.map((c) => (c.dish_id === dishId ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { dish_id: dishId, name, price, quantity: 1 }];
    });
  };

  const updateQty = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.dish_id === dishId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const submitSale = async () => {
    if (cart.length === 0) return;
    try {
      await create.mutateAsync({
        items: cart.map((c) => ({ dish_id: c.dish_id, quantity: c.quantity, unit_price: c.price })),
      });
      toast.success(t('actions.validateSale'));
      setCart([]);
    } catch (error: unknown) {
      if (error instanceof InsufficientStockError) {
        toast.error(
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-400" />
            <span>{t('alerts.insufficientStock')}</span>
          </div>,
          { duration: 4000 }
        );
      } else if (error instanceof Error) {
        toast.error(error.message ?? t('alerts.error'));
      } else {
        toast.error(t('alerts.error'));
      }
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('sales.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('nav.sales')}</h1>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full max-w-xs">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder={t('sales.search')}
            className="bg-transparent w-full outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((dish) => (
          <button
            key={dish.id}
            className="glass rounded-xl p-3 text-left hover:border-primary/40 border border-white/10"
            onClick={() => addToCart(dish.id, dish.name, dish.price)}
          >
            <p className="font-semibold text-white">{dish.name}</p>
            <p className="text-xs text-gray-400">{formatCurrency(dish.price, 'THB', language)}</p>
            <p className="text-xs text-gray-400">
              {t('dishes.cost')}: {formatCurrency(dish.cost ?? 0, 'THB', language)} • {dish.margin ?? 0}%
            </p>
          </button>
        ))}
      </div>

      <Card title={t('sales.cart')} actions={<BadgeTotal value={total} lang={language} />}>
        {cart.length === 0 && <p className="text-gray-400 text-sm">{t('sales.emptyCart')}</p>}
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.dish_id} className="flex items-center justify-between glass rounded-xl p-3">
              <div>
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {formatCurrency(item.price, 'THB', language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center"
                  onClick={() => updateQty(item.dish_id, -1)}
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center"
                  onClick={() => updateQty(item.dish_id, 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="font-semibold text-white">
                {formatCurrency(item.price * item.quantity, 'THB', language)}
              </p>
            </div>
          ))}
        </div>
        <Button block className="mt-4" onClick={submitSale} disabled={create.isPending || cart.length === 0}>
          {create.isPending ? t('common.loading') : `${t('actions.validateSale')} • ${formatCurrency(total, 'THB', language)}`}
        </Button>
      </Card>
    </div>
  );
}

function BadgeTotal({ value, lang }: { value: number; lang: string }) {
  return (
    <div className="bg-white/10 text-white px-3 py-2 rounded-xl text-sm flex items-center gap-2">
      <Check size={16} className="text-primary" />
      {formatCurrency(value, 'THB', lang)}
    </div>
  );
}
