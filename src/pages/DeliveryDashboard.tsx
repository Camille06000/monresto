import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck, Phone, MapPin, Clock, CheckCircle2,
  PackageCheck, Loader2, UserCheck, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeliveryOrders } from '../hooks/useDeliveryOrders';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../lib/utils';
import type { Sale, DeliveryStatus } from '../lib/types';

// ── Fetch restaurant members with role 'driver' ───────────────────────────────
function useDrivers(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['drivers', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_members')
        .select('user_id, role, profiles:user_id(full_name)')
        .eq('restaurant_id', restaurantId!)
        .eq('role', 'driver');
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ user_id: string; role: string; profiles: { full_name: string | null }[] | null }>;
    },
    enabled: !!restaurantId,
  });
}

// ── Status column config ──────────────────────────────────────────────────────
const COLUMNS: { status: DeliveryStatus | null; labelKey: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  {
    status: 'pending_pickup',
    labelKey: 'delivery.status.pending_pickup',
    color: 'border-orange-500/40 bg-orange-500/5',
    icon: Clock,
  },
  {
    status: 'in_transit',
    labelKey: 'delivery.status.in_transit',
    color: 'border-blue-500/40 bg-blue-500/5',
    icon: Truck,
  },
  {
    status: 'delivered',
    labelKey: 'delivery.status.delivered',
    color: 'border-emerald-500/40 bg-emerald-500/5',
    icon: CheckCircle2,
  },
];

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending_pickup: 'in_transit',
  in_transit: 'delivered',
};

const NEXT_LABEL_KEY: Partial<Record<DeliveryStatus, string>> = {
  pending_pickup: 'delivery.action.markInTransit',
  in_transit: 'delivery.action.markDelivered',
};

// ── Delivery card ─────────────────────────────────────────────────────────────
function DeliveryCard({
  order,
  drivers,
  onStatusChange,
  onAssignDriver,
}: {
  order: Sale;
  drivers: Array<{ user_id: string; profiles: { full_name: string | null }[] | null }>;
  onStatusChange: (id: string, status: DeliveryStatus) => void;
  onAssignDriver: (id: string, driverId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const currency = 'THB';

  const nextStatus = order.delivery_status ? NEXT_STATUS[order.delivery_status] : undefined;
  const nextLabelKey = order.delivery_status ? NEXT_LABEL_KEY[order.delivery_status] : undefined;

  const timeStr = order.delivery_requested_time
    ? new Date(order.delivery_requested_time).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      {/* Order ID + time */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
        <span className="text-xs text-gray-400">
          {new Date(order.created_at ?? '').toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Customer info */}
      <div className="space-y-1">
        <p className="font-semibold text-white text-sm">{order.delivery_name ?? '—'}</p>
        {order.delivery_phone && (
          <a
            href={`tel:${order.delivery_phone}`}
            className="flex items-center gap-1.5 text-primary text-xs hover:text-primary/80 transition-colors"
          >
            <Phone size={12} /> {order.delivery_phone}
          </a>
        )}
        {order.delivery_address && (
          <p className="flex items-start gap-1.5 text-gray-400 text-xs">
            <MapPin size={12} className="mt-0.5 flex-shrink-0" />
            {order.delivery_address}
          </p>
        )}
        {timeStr && (
          <p className="flex items-center gap-1.5 text-yellow-400 text-xs">
            <Clock size={12} /> {t('delivery.requestedTime')}: {timeStr}
          </p>
        )}
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="border-t border-white/10 pt-2 space-y-0.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-gray-400">
              <span>{item.quantity}× {item.dish?.name ?? item.dish_id.slice(0, 8)}</span>
              <span>{formatCurrency(item.total_price, currency, lang)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between items-center border-t border-white/10 pt-2">
        <div>
          <span className="text-xs text-gray-500">{t('customerMenu.total')}</span>
          {(order.delivery_fee ?? 0) > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              +{formatCurrency(order.delivery_fee ?? 0, currency, lang)} {t('delivery.fee')}
            </span>
          )}
        </div>
        <span className="font-bold text-primary text-sm">
          {formatCurrency((order.total_amount ?? 0) + (order.delivery_fee ?? 0), currency, lang)}
        </span>
      </div>

      {/* Driver assignment */}
      {drivers.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs text-gray-500 flex items-center gap-1">
            <UserCheck size={12} /> {t('delivery.assign_driver')}
          </label>
          <select
            value={order.assigned_driver_id ?? ''}
            onChange={(e) => {
              if (e.target.value) onAssignDriver(order.id, e.target.value);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">{t('delivery.noDriver')}</option>
            {drivers.map((d) => (
              <option key={d.user_id} value={d.user_id}>
                {d.profiles?.[0]?.full_name ?? d.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action button */}
      {nextStatus && nextLabelKey && (
        <button
          onClick={() => onStatusChange(order.id, nextStatus)}
          className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl py-2.5 text-sm font-semibold transition-all"
        >
          {t(nextLabelKey)}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DeliveryDashboard() {
  const { t } = useTranslation();
  const { currentRestaurant } = useStore();
  const restaurantId = currentRestaurant?.id;

  const { orders, updateDeliveryStatus, assignDriver } = useDeliveryOrders();
  const { data: drivers = [] } = useDrivers(restaurantId);

  // Show last 20 delivered orders too
  const [showDelivered, setShowDelivered] = useState(false);

  const allOrders = orders.data ?? [];

  const byStatus = (status: DeliveryStatus) =>
    allOrders.filter((o) => o.delivery_status === status);

  // Include null delivery_status (orders just created, not yet picked up)
  const pendingOrders = allOrders.filter(
    (o) => o.delivery_status === 'pending_pickup' || o.delivery_status === null
  );
  const inTransitOrders = byStatus('in_transit');
  const deliveredOrders = byStatus('delivered');

  const handleStatusChange = async (id: string, status: DeliveryStatus) => {
    try {
      await updateDeliveryStatus.mutateAsync({ id, status });
      if (status === 'delivered') {
        toast.success(t('delivery.markedDelivered'), { icon: '✅' });
      }
    } catch {
      toast.error(t('alerts.error'));
    }
  };

  const handleAssignDriver = async (id: string, driverId: string) => {
    try {
      await assignDriver.mutateAsync({ id, driverId });
      toast.success(t('delivery.driverAssigned'), { icon: '🚴' });
    } catch {
      toast.error(t('alerts.error'));
    }
  };

  const columnOrders = [pendingOrders, inTransitOrders, deliveredOrders];

  return (
    <div className="p-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Truck className="text-primary" size={24} />
        <h1 className="text-2xl font-black text-white">{t('delivery.title')}</h1>
        {orders.isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {/* Kanban columns */}
      {orders.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col, idx) => {
            const colOrders = columnOrders[idx];
            const Icon = col.icon;

            // For delivered column, we don't show it unless toggled (already filtered out from main query)
            if (col.status === 'delivered' && !showDelivered) {
              return (
                <div key={col.status} className={`rounded-2xl border p-4 ${col.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-emerald-400" />
                    <span className="font-bold text-sm text-white">{t(col.labelKey)}</span>
                    <span className="ml-auto text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">
                      {colOrders.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDelivered(true)}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 py-3 text-center transition-colors"
                  >
                    {t('delivery.showDelivered')}
                  </button>
                </div>
              );
            }

            return (
              <div key={col.status ?? 'pending'} className={`rounded-2xl border p-4 ${col.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={
                    col.status === 'pending_pickup' ? 'text-orange-400'
                    : col.status === 'in_transit' ? 'text-blue-400'
                    : 'text-emerald-400'
                  } />
                  <span className="font-bold text-sm text-white">{t(col.labelKey)}</span>
                  <span className="ml-auto text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {colOrders.length === 0 ? (
                  <p className="text-center text-gray-600 text-xs py-6">{t('delivery.noOrders')}</p>
                ) : (
                  <div className="space-y-3">
                    {colOrders.map((order) => (
                      <DeliveryCard
                        key={order.id}
                        order={order}
                        drivers={drivers}
                        onStatusChange={handleStatusChange}
                        onAssignDriver={handleAssignDriver}
                      />
                    ))}
                  </div>
                )}

                {col.status === 'delivered' && showDelivered && (
                  <button
                    onClick={() => setShowDelivered(false)}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 mt-3 py-2 text-center transition-colors border-t border-white/10"
                  >
                    {t('delivery.hideDelivered')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!orders.isLoading && allOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <PackageCheck size={48} className="text-gray-700" />
          <p className="text-gray-500">{t('delivery.noOrders')}</p>
          <p className="text-xs text-gray-600">{t('delivery.noOrdersHint')}</p>
        </div>
      )}
    </div>
  );
}
