import { useTranslation } from 'react-i18next';
import {
  Truck, Phone, MapPin, Clock, PackageCheck,
  Loader2, LogOut, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyDeliveries } from '../hooks/useDeliveryOrders';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../lib/utils';
import type { DeliveryStatus, Sale } from '../lib/types';

// ── Single delivery card ──────────────────────────────────────────────────────
function DriverDeliveryCard({
  order,
  onStatusChange,
}: {
  order: Sale;
  onStatusChange: (id: string, status: DeliveryStatus) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const timeStr = order.delivery_requested_time
    ? new Date(order.delivery_requested_time).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
    : null;

  const isPickup = order.delivery_status === 'pending_pickup' || order.delivery_status === null;

  const statusBadge = isPickup
    ? { label: t('delivery.status.pending_pickup'), cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
    : { label: t('delivery.status.in_transit'), cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Status badge + order ID */}
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
        <span className="text-xs text-gray-500 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
      </div>

      {/* Customer info */}
      <div className="space-y-2">
        <p className="font-bold text-white text-base">{order.delivery_name ?? '—'}</p>
        {order.delivery_phone && (
          <a
            href={`tel:${order.delivery_phone}`}
            className="flex items-center gap-2 text-primary text-sm font-semibold hover:text-primary/80 transition-colors"
          >
            <Phone size={15} /> {order.delivery_phone}
          </a>
        )}
        {order.delivery_address && (
          <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3 border border-white/5">
            <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-300 text-sm leading-snug">{order.delivery_address}</p>
          </div>
        )}
        {timeStr && (
          <p className="flex items-center gap-2 text-yellow-400 text-sm">
            <Clock size={14} /> {t('delivery.requestedTime')}: <strong>{timeStr}</strong>
          </p>
        )}
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="border-t border-white/10 pt-3 space-y-1.5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('delivery.items')}</p>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-300">{item.quantity}× {item.dish?.name ?? '—'}</span>
              <span className="text-gray-400">{formatCurrency(item.total_price, 'THB', lang)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between items-center border-t border-white/10 pt-3">
        <span className="text-gray-400 text-sm">{t('customerMenu.total')}</span>
        <span className="font-black text-primary text-lg">
          {formatCurrency((order.total_amount ?? 0) + (order.delivery_fee ?? 0), 'THB', lang)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {isPickup && (
          <button
            onClick={() => onStatusChange(order.id, 'in_transit')}
            className="w-full flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-xl py-3.5 text-sm font-bold transition-all"
          >
            <Package size={16} />
            {t('delivery.action.markPickedUp')}
          </button>
        )}
        {order.delivery_status === 'in_transit' && (
          <button
            onClick={() => onStatusChange(order.id, 'delivered')}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl py-3.5 text-sm font-bold transition-all"
          >
            <PackageCheck size={16} />
            {t('delivery.action.markDelivered')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DriverView() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { deliveries, updateStatus } = useMyDeliveries();

  const orders = deliveries.data ?? [];

  const handleStatusChange = async (id: string, status: DeliveryStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      if (status === 'in_transit') {
        toast.success(t('delivery.pickedUp'), { icon: '📦' });
      } else if (status === 'delivered') {
        toast.success(t('delivery.markedDelivered'), { icon: '✅' });
      }
    } catch {
      toast.error(t('alerts.error'));
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0b1220]/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Truck size={22} className="text-primary" />
            <h1 className="font-black text-lg">{t('delivery.driverTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {deliveries.isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <LogOut size={13} />
              {t('app.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-10">
        {deliveries.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PackageCheck size={56} className="text-gray-700" />
            <p className="text-gray-400 font-semibold">{t('delivery.noAssignedDeliveries')}</p>
            <p className="text-xs text-gray-600 text-center max-w-xs">{t('delivery.noAssignedHint')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {orders.length} {t('delivery.deliveryCount')}
            </p>
            {orders.map((order) => (
              <DriverDeliveryCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
