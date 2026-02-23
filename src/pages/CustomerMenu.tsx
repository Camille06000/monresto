import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, X, Loader2,
  UtensilsCrossed, MapPin, Phone, Truck, Home,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, getLocalizedName } from '../lib/utils';
import { printReceipt } from '../components/Receipt';
import { useCustomerMenu } from '../hooks/useCustomerMenu';
import { queueOrder, type QueuedOrder } from '../lib/offlineQueue';
import { PaymentModal } from '../components/PaymentModal';
import type { Dish, Sale, SaleItem, PaymentMethod, PaymentSettings } from '../lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CartItem {
  dish_id: string;
  name: string;
  price: number;
  quantity: number;
  photo_url?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'th', label: 'TH', flag: '🇹🇭' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
] as const;

const TABLE_NUMBERS = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
];

const CAT_GRADIENTS = [
  'from-sky-500/25 to-sky-600/10',
  'from-orange-500/25 to-orange-600/10',
  'from-emerald-500/25 to-emerald-600/10',
  'from-pink-500/25 to-pink-600/10',
  'from-violet-500/25 to-violet-600/10',
  'from-amber-500/25 to-amber-600/10',
  'from-rose-500/25 to-rose-600/10',
  'from-teal-500/25 to-teal-600/10',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCategoryEmoji(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes('sushi') || c.includes('maki') || c.includes('roll') || c.includes('japon')) return '🍱';
  if (c.includes('burger') || c.includes('sandwich') || c.includes('wrap')) return '🍔';
  if (c.includes('pizza') || c.includes('calzone')) return '🍕';
  if (c.includes('bowl') || c.includes('poke') || c.includes('poké')) return '🥣';
  if (c.includes('entree') || c.includes('entrée') || c.includes('starter') || c.includes('apero')) return '🥗';
  if (c.includes('salade') || c.includes('salad')) return '🥗';
  if (c.includes('grill') || c.includes('viande') || c.includes('meat') || c.includes('bbq')) return '🥩';
  if (c.includes('soupe') || c.includes('soup') || c.includes('bouillon')) return '🍜';
  if (c.includes('curry') || c.includes('thai') || c.includes('asiat')) return '🍛';
  if (c.includes('dessert') || c.includes('gateau') || c.includes('glace') || c.includes('cake')) return '🍰';
  if (c.includes('boisson') || c.includes('drink') || c.includes('jus') || c.includes('cafe') || c.includes('thé')) return '🥤';
  if (c.includes('tacos') || c.includes('mexi') || c.includes('nachos')) return '🌮';
  if (c.includes('pasta') || c.includes('pates') || c.includes('nouille')) return '🍝';
  if (c.includes('plat') || c.includes('main') || c.includes('principal')) return '🍽️';
  return '🍽️';
}

// Fallback initials avatar when no logo
function RestaurantAvatar({ name, size = 88 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg ring-4 ring-white/20"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ── Desktop sidebar category item ─────────────────────────────────────────────
function CategorySidebarItem({
  cat, isActive, previews, count, onClick,
}: {
  cat: string; isActive: boolean; previews: string[]; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-3 transition-all border ${
        isActive
          ? 'bg-primary/15 border-primary/40 text-primary'
          : 'border-transparent hover:bg-white/5 text-gray-300 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{getCategoryEmoji(cat)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm capitalize truncate">{cat}</p>
          <p className="text-xs opacity-50">{count} plat{count > 1 ? 's' : ''}</p>
        </div>
      </div>
      {previews.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {previews.slice(0, 2).map((url, i) => (
            <img
              key={i}
              src={url}
              className="h-11 w-11 rounded-xl object-cover border border-white/10"
              alt=""
            />
          ))}
          {count > 2 && (
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-400 font-bold">
              +{count - 2}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ── Mobile category tab ────────────────────────────────────────────────────────
function CategoryMobileTab({
  cat, isActive, preview, onClick,
}: {
  cat: string; isActive: boolean; preview: string | null; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 flex-shrink-0 px-3 py-2.5 rounded-2xl transition-all min-w-[82px] border ${
        isActive
          ? 'bg-primary/15 border-primary/40 text-primary'
          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      <div className="h-14 w-14 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
        {preview
          ? <img src={preview} className="h-full w-full object-cover" alt="" />
          : <span>{getCategoryEmoji(cat)}</span>
        }
      </div>
      <span className={`text-xs font-semibold capitalize text-center leading-tight max-w-[78px] line-clamp-2 ${isActive ? 'text-primary' : ''}`}>
        {cat}
      </span>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function CustomerMenu() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const { restaurant, dishes, loading } = useCustomerMenu(slug);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<string>('th');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Table number state
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [tableInput, setTableInput] = useState<string>('');

  // Delivery mode state
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const pendingTableRef = useRef<string>('');

  // Sync language with i18n
  useEffect(() => { i18n.changeLanguage(language); }, [language, i18n]);

  // Payment settings from restaurant.settings JSONB
  const paymentSettings = useMemo<PaymentSettings>(
    () => (restaurant?.settings ?? {}) as PaymentSettings,
    [restaurant?.settings],
  );

  // Delivery settings from restaurant.settings JSONB
  const deliveryFee = Number((restaurant?.settings as Record<string, unknown>)?.delivery_fee ?? 0);
  const hasPaymentProviders = !!(
    (paymentSettings.stripe_enabled && paymentSettings.stripe_publishable_key) ||
    paymentSettings.omise_enabled ||
    paymentSettings.sumup_enabled
  );

  // ── Category & grouping ──────────────────────────────────────────────────
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const d of dishes) {
      const cat = d.category || 'plat';
      if (!seen.has(cat)) { seen.add(cat); result.push(cat); }
    }
    return result;
  }, [dishes]);

  const grouped = useMemo(() => {
    const groups: Record<string, Dish[]> = {};
    for (const d of dishes) {
      const cat = d.category || 'plat';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    }
    return groups;
  }, [dishes]);

  // Auto-select first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Preview images per category (first 2 with photo)
  const previewsByCategory = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const cat of categories) {
      result[cat] = (grouped[cat] ?? [])
        .filter((d) => d.photo_url)
        .slice(0, 2)
        .map((d) => d.photo_url!);
    }
    return result;
  }, [categories, grouped]);

  // Search results (cross-category)
  const filtered = useMemo(
    () => dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.name_en ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (d.name_th ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [dishes, search],
  );

  // Active dishes: search mode shows all matches; otherwise selected category
  const activeDishes = useMemo(
    () => search ? filtered : (grouped[activeCategory ?? ''] ?? []),
    [search, filtered, grouped, activeCategory],
  );

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.dish_id === dish.id);
      if (existing) {
        return prev.map((c) => c.dish_id === dish.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        dish_id:   dish.id,
        name:      getLocalizedName(dish, language),
        price:     dish.price,
        quantity:  1,
        photo_url: dish.photo_url,
      }];
    });
    toast.success(getLocalizedName(dish, language), { duration: 800, icon: '🛒' });
  };

  const updateQty = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.dish_id === dishId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => prev.filter((c) => c.dish_id !== dishId));
  };

  const total     = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalWithDelivery = deliveryMode ? total + deliveryFee : total;

  // ── Order flow ───────────────────────────────────────────────────────────
  const handleOrderClick = () => {
    if (cart.length === 0) return;
    if (deliveryMode) {
      setShowDeliveryForm(true);
    } else {
      setTableInput(tableNumber);
      setShowTableModal(true);
    }
  };

  const confirmDeliveryForm = () => {
    if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) return;
    setShowDeliveryForm(false);
    if (hasPaymentProviders && navigator.onLine) {
      pendingTableRef.current = '';
      setShowPaymentModal(true);
    } else {
      submitOrder('', 'cash');
    }
  };

  const confirmTable = () => {
    const val = tableInput.trim();
    if (!val) return;
    setTableNumber(val);
    setShowTableModal(false);
    if (hasPaymentProviders && navigator.onLine) {
      pendingTableRef.current = val;
      setShowPaymentModal(true);
    } else {
      submitOrder(val, 'cash');
    }
  };

  const handlePaymentSuccess = (method: PaymentMethod, providerId?: string) => {
    setShowPaymentModal(false);
    submitOrder(pendingTableRef.current, method, providerId);
  };

  const submitOrder = async (
    tbl: string,
    paymentMethod: PaymentMethod = 'cash',
    paymentProviderId?: string,
  ) => {
    if (cart.length === 0 || !restaurant?.id) return;
    setSubmitting(true);

    if (!navigator.onLine) {
      try {
        const order: QueuedOrder = {
          id: crypto.randomUUID(),
          restaurant_id: restaurant.id,
          table_number: tbl || null,
          items: cart.map((c) => ({ dish_id: c.dish_id, quantity: c.quantity, unit_price: c.price })),
          created_at: new Date().toISOString(),
        };
        await queueOrder(order);
        toast.success(t('pwa.orderQueued'), { duration: 4000, icon: '📱' });
        setCart([]);
        setShowCart(false);
      } catch {
        toast.error(t('customerMenu.orderError'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const salePayload: Record<string, unknown> = {
        restaurant_id:        restaurant.id,
        table_number:         deliveryMode ? null : (tbl || null),
        payment_method:       paymentMethod,
        payment_status:       paymentMethod === 'cash' ? 'pending' : 'paid',
        payment_provider_id:  paymentProviderId ?? null,
      };

      // Delivery-specific fields
      if (deliveryMode) {
        salePayload.order_type = 'delivery';
        salePayload.delivery_name = deliveryName.trim();
        salePayload.delivery_phone = deliveryPhone.trim();
        salePayload.delivery_address = deliveryAddress.trim();
        salePayload.delivery_fee = deliveryFee;
        salePayload.delivery_status = 'pending_pickup';
        if (deliveryTime) {
          // Combine today's date with the chosen time
          const today = new Date().toISOString().split('T')[0];
          salePayload.delivery_requested_time = `${today}T${deliveryTime}:00`;
        }
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(salePayload)
        .select()
        .single();
      if (saleError) throw saleError;

      const items = cart.map((c) => ({
        sale_id:    (sale as any).id,
        dish_id:    c.dish_id,
        quantity:   c.quantity,
        unit_price: c.price,
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) {
        await supabase.from('sales').delete().eq('id', (sale as any).id);
        throw itemsError;
      }

      toast.success(t('customerMenu.orderSuccess'), { duration: 3000, icon: '✅' });

      const saleForPrint: Sale = {
        id:           (sale as any).id,
        sale_date:    (sale as any).sale_date,
        total_amount: totalWithDelivery,
        created_at:   (sale as any).created_at,
        items: cart.map((c, idx) => ({
          id:          `temp-${idx}`,
          sale_id:     (sale as any).id,
          dish_id:     c.dish_id,
          quantity:    c.quantity,
          unit_price:  c.price,
          total_price: c.price * c.quantity,
          dish: { id: c.dish_id, name: c.name, price: c.price, is_active: true },
        })),
      };
      printReceipt(saleForPrint, saleForPrint.items as SaleItem[], {
        name: restaurant?.name || '',
        address: restaurant?.address,
        phone:   restaurant?.phone,
      });

      setCart([]);
      setShowCart(false);
      // Reset delivery form
      if (deliveryMode) {
        setDeliveryName('');
        setDeliveryPhone('');
        setDeliveryAddress('');
        setDeliveryTime('');
      }
    } catch (error: unknown) {
      console.error('[CustomerMenu] Order error:', error);
      toast.error(t('customerMenu.orderError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / not-found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🍜</p>
          <p className="text-gray-400">{t('customerMenu.restaurantNotFound')}</p>
        </div>
      </div>
    );
  }

  const activeCatIdx = categories.indexOf(activeCategory ?? '');
  const activeGradient = CAT_GRADIENTS[activeCatIdx >= 0 ? activeCatIdx % CAT_GRADIENTS.length : 0];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <Toaster position="top-center" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/60 via-violet-950/30 to-[#0b1220]" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-4 right-1/4 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 pt-8 pb-6">
          {/* Language buttons */}
          <div className="flex justify-end gap-1 mb-6">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  language === l.code
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>

          {/* Logo + info */}
          <div className="flex flex-col items-center text-center gap-4">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="rounded-2xl object-cover shadow-2xl ring-4 ring-white/15"
                style={{ height: 88, width: 88 }}
              />
            ) : (
              <RestaurantAvatar name={restaurant.name} size={88} />
            )}
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{restaurant.name}</h1>
              <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                {restaurant.address && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={12} /> {restaurant.address}
                  </span>
                )}
                {restaurant.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={12} /> {restaurant.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DELIVERY / DINE-IN TOGGLE ─────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1 max-w-xs">
          <button
            onClick={() => setDeliveryMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              !deliveryMode
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home size={16} />
            {t('customerMenu.modeDineIn')}
          </button>
          <button
            onClick={() => setDeliveryMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              deliveryMode
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Truck size={16} />
            {t('customerMenu.modeDelivery')}
          </button>
        </div>
        {deliveryMode && deliveryFee > 0 && (
          <p className="text-xs text-gray-400 mt-2 ml-1">
            🚴 {t('customerMenu.deliveryFeeInfo', { fee: formatCurrency(deliveryFee, restaurant?.currency || 'THB', language) })}
          </p>
        )}
      </div>

      {/* ── KIOSK BODY: sidebar + main ────────────────────────────────────── */}
      <div className="flex max-w-[1400px] mx-auto">

        {/* ── DESKTOP SIDEBAR ───────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-white/10 bg-[#0b1220]/95 backdrop-blur-md">
          <div className="py-4 px-3 space-y-1">
            <p className="text-xs uppercase tracking-widest text-gray-500 px-2 mb-3">
              {t('customerMenu.categories')}
            </p>
            {categories.map((cat) => (
              <CategorySidebarItem
                key={cat}
                cat={cat}
                isActive={!search && activeCategory === cat}
                previews={previewsByCategory[cat] ?? []}
                count={grouped[cat]?.length ?? 0}
                onClick={() => { setActiveCategory(cat); setSearch(''); }}
              />
            ))}
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 py-5 pb-32">

          {/* Mobile category tabs */}
          {categories.length > 0 && (
            <div className="lg:hidden mb-5">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <CategoryMobileTab
                    key={cat}
                    cat={cat}
                    isActive={!search && activeCategory === cat}
                    preview={previewsByCategory[cat]?.[0] ?? null}
                    onClick={() => { setActiveCategory(cat); setSearch(''); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-5 focus-within:border-primary/40 transition-colors">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              placeholder={t('customerMenu.search')}
              className="bg-transparent w-full outline-none text-sm placeholder-gray-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* ── Dish content ─────────────────────────────────────────────── */}
          {activeDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🔍</span>
              <p className="text-gray-400 text-sm">{t('customerMenu.noDishes')}</p>
            </div>
          ) : (
            <div>
              {/* Category header (hide during search) */}
              {!search && activeCategory && (
                <div className={`flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl bg-gradient-to-r ${activeGradient} border border-white/5`}>
                  <span className="text-2xl">{getCategoryEmoji(activeCategory)}</span>
                  <h2 className="text-lg font-bold capitalize">{activeCategory}</h2>
                  <span className="ml-auto text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                    {activeDishes.length}
                  </span>
                </div>
              )}

              {/* Search count header */}
              {search && (
                <p className="text-sm text-gray-400 mb-4">
                  {filtered.length} {t('customerMenu.results')}
                </p>
              )}

              {/* Dish grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {activeDishes.map((dish) => {
                  const inCart = cart.find((c) => c.dish_id === dish.id);
                  return (
                    <button
                      key={dish.id}
                      className="group relative glass rounded-2xl overflow-hidden text-left hover:border-primary/50 border border-white/10 transition-all duration-200 active:scale-95 hover:shadow-xl hover:shadow-primary/10"
                      onClick={() => addToCart(dish)}
                    >
                      {/* Photo */}
                      <div className="relative overflow-hidden">
                        {dish.photo_url ? (
                          <img
                            src={dish.photo_url}
                            alt={getLocalizedName(dish, language)}
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-36 bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center text-4xl">
                            {getCategoryEmoji(dish.category || 'plat')}
                          </div>
                        )}

                        {/* Cart quantity badge */}
                        {inCart && (
                          <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                            {inCart.quantity}
                          </div>
                        )}

                        {/* Price badge */}
                        <div className="absolute bottom-2 left-2 bg-[#0b1220]/90 backdrop-blur-sm text-primary font-bold text-sm px-2.5 py-1 rounded-xl border border-white/10">
                          {formatCurrency(dish.price, 'THB', language)}
                        </div>
                      </div>

                      {/* Name + add button */}
                      <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                        <p className="font-semibold text-white text-sm leading-snug flex-1">
                          {getLocalizedName(dish, language)}
                        </p>
                        <div className="flex-shrink-0 h-7 w-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <Plus size={14} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── FLOATING CART PILL ────────────────────────────────────────────── */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-3 bg-primary text-white rounded-full px-5 py-3.5 shadow-2xl shadow-primary/40 active:scale-95 transition-transform hover:bg-primary/90"
          >
            <div className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-black rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-sm">
              {cartCount} {cartCount > 1 ? t('customerMenu.items') : t('customerMenu.item')}
            </span>
            <span className="font-black">{formatCurrency(total, 'THB', language)}</span>
          </button>
        </div>
      )}

      {/* ── CART PANEL (slide-up) ─────────────────────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="bg-[#0d1626] border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" />
                {t('customerMenu.cart')}
                <span className="text-sm text-gray-400 font-normal">({cartCount})</span>
              </h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-4xl">🛒</span>
                  <p className="text-gray-400 text-sm">{t('customerMenu.emptyCart')}</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.dish_id} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatCurrency(item.price, 'THB', language)} / pièce
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                        onClick={() => updateQty(item.dish_id, -1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        className="h-8 w-8 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"
                        onClick={() => updateQty(item.dish_id, 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <p className="font-bold text-sm w-16 text-right text-primary">
                      {formatCurrency(item.price * item.quantity, 'THB', language)}
                    </p>
                    <button onClick={() => removeFromCart(item.dish_id)} className="text-red-400 hover:text-red-300 p-1 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-white/10 space-y-3">
                {tableNumber && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                    <UtensilsCrossed size={15} className="text-primary" />
                    <span className="text-sm text-primary font-semibold">
                      {t('customerMenu.table')} {tableNumber}
                    </span>
                    <button onClick={() => setTableNumber('')} className="ml-auto text-gray-400 hover:text-gray-200">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">{t('customerMenu.total')}</span>
                  <span className="text-xl font-black text-white">{formatCurrency(total, restaurant?.currency || 'THB', language)}</span>
                </div>
                {deliveryMode && deliveryFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1"><Truck size={13} /> {t('customerMenu.deliveryFee')}</span>
                    <span className="text-gray-300 font-semibold">+{formatCurrency(deliveryFee, restaurant?.currency || 'THB', language)}</span>
                  </div>
                )}
                {deliveryMode && deliveryFee > 0 && (
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-gray-300 font-bold">{t('customerMenu.totalWithDelivery')}</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(totalWithDelivery, restaurant?.currency || 'THB', language)}</span>
                  </div>
                )}
                <button
                  onClick={handleOrderClick}
                  disabled={submitting}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50 active:scale-98 transition-all shadow-lg shadow-primary/30 hover:bg-primary/90"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
                    </span>
                  ) : (
                    `${t('customerMenu.orderNow')} • ${formatCurrency(totalWithDelivery, restaurant?.currency || 'THB', language)}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ─────────────────────────────────────────────────── */}
      {showPaymentModal && restaurant && (
        <PaymentModal
          total={total}
          currency={restaurant.currency || 'THB'}
          restaurantId={restaurant.id}
          paymentSettings={paymentSettings}
          language={language}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* ── DELIVERY FORM MODAL ───────────────────────────────────────────── */}
      {showDeliveryForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeliveryForm(false)} />
          <div className="relative bg-[#0f1929] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={20} className="text-primary" />
              <h3 className="font-bold text-lg">{t('customerMenu.deliveryFormTitle')}</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">{t('customerMenu.deliveryFormSubtitle')}</p>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('customerMenu.deliveryName')} *</label>
                <input
                  type="text"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              {/* Phone */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('customerMenu.deliveryPhone')} *</label>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="Ex: 06 12 34 56 78"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              {/* Address */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('customerMenu.deliveryAddress')} *</label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ex: 12 rue du marché, Bangkok 10110"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors resize-none"
                />
              </div>
              {/* Time */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('customerMenu.deliveryTime')} ({t('customerMenu.optional')})</label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowDeliveryForm(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10 transition-colors"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={confirmDeliveryForm}
                disabled={!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {t('customerMenu.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE NUMBER MODAL ────────────────────────────────────────────── */}
      {showTableModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTableModal(false)} />
          <div className="relative bg-[#0f1929] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed size={20} className="text-primary" />
              <h3 className="font-bold text-lg">{t('customerMenu.tableTitle')}</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">{t('customerMenu.tableSubtitle')}</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TABLE_NUMBERS.map((n) => (
                <button
                  key={n}
                  onClick={() => setTableInput(n)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    tableInput === n
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              placeholder={t('customerMenu.tableCustom')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 mb-4 transition-colors"
              maxLength={10}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10 transition-colors"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={confirmTable}
                disabled={!tableInput.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {t('customerMenu.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
