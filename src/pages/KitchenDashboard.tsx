import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, ChefHat, Clock, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { useKitchenOrders } from '../hooks/useKitchenOrders';
import { useStore } from '../store/useStore';
import { getLocalizedName } from '../lib/utils';
import { playAlarm } from '../lib/sound';
import type { Sale } from '../lib/types';

const STATUSES = [
  { key: 'pending', icon: '🔔', color: 'border-orange-500/50', bg: 'bg-orange-500/10', headerBg: 'bg-orange-500/20', text: 'text-orange-400', action: 'moveToPrep', next: 'preparing' },
  { key: 'preparing', icon: '🔥', color: 'border-blue-500/50', bg: 'bg-blue-500/10', headerBg: 'bg-blue-500/20', text: 'text-blue-400', action: 'moveToReady', next: 'ready' },
  { key: 'ready', icon: '✅', color: 'border-green-500/50', bg: 'bg-green-500/10', headerBg: 'bg-green-500/20', text: 'text-green-400', action: 'moveToDelivered', next: 'delivered' },
] as const;

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diffMs = now - created;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`;
}

// ─── Component ───

export function KitchenDashboard() {
  const { t } = useTranslation();
  const { language } = useStore();
  const { orders, updateStatus } = useKitchenOrders();
  const [muted, setMuted] = useState(false);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPendingCount = useRef(0);

  const grouped = useMemo(() => {
    const data = orders.data ?? [];
    return {
      pending: data.filter((s) => s.status === 'pending'),
      preparing: data.filter((s) => s.status === 'preparing'),
      ready: data.filter((s) => s.status === 'ready'),
    };
  }, [orders.data]);

  // Sound notification every 30s for pending orders
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!muted && grouped.pending.length > 0) {
        playAlarm('kitchen');
      }
    }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [muted, grouped.pending.length]);

  // Play beep immediately when new pending order arrives
  useEffect(() => {
    if (grouped.pending.length > prevPendingCount.current && !muted) {
      playAlarm('kitchen');
    }
    prevPendingCount.current = grouped.pending.length;
  }, [grouped.pending.length, muted]);

  // Update timestamps every 30s
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const handleMove = useCallback(
    (sale: Sale, nextStatus: string) => {
      updateStatus.mutate({ id: sale.id, status: nextStatus });
    },
    [updateStatus],
  );

  if (orders.isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const totalActive = grouped.pending.length + grouped.preparing.length + grouped.ready.length;

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <ChefHat size={24} className="text-primary" />
          <h1 className="text-xl font-bold">{t('kitchen.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Counters */}
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 font-bold">
              🔔 {grouped.pending.length}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-bold">
              🔥 {grouped.preparing.length}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 font-bold">
              ✅ {grouped.ready.length}
            </span>
          </div>
          {/* Refresh button */}
          <button
            onClick={() => orders.refetch()}
            className="p-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={16} className={orders.isFetching ? 'animate-spin' : ''} />
          </button>
          {/* Sound test + mute */}
          <button
            onClick={() => {
              if (muted) {
                setMuted(false);
                playAlarm('kitchen'); // test sound on unmute
              } else {
                setMuted(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              muted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {muted ? <BellOff size={16} /> : <Bell size={16} />}
            {muted ? t('kitchen.soundOff') : t('kitchen.soundOn')}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {totalActive === 0 && (
        <div className="text-center py-16">
          <ChefHat size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">{t('kitchen.noOrders')}</p>
        </div>
      )}

      {/* 3-column layout */}
      {totalActive > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUSES.map((col) => {
            const items = grouped[col.key as keyof typeof grouped];
            return (
              <div key={col.key} className="flex flex-col gap-3">
                {/* Column header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{col.icon}</span>
                    <h2 className={`font-bold ${col.text}`}>{t(`kitchen.${col.key}`)}</h2>
                  </div>
                  <span className={`text-lg font-bold ${col.text}`}>{items.length}</span>
                </div>

                {/* Order cards */}
                <div className="space-y-3">
                  {items.map((sale) => {
                    const isOld = sale.created_at && Date.now() - new Date(sale.created_at).getTime() > 5 * 60_000;
                    return (
                      <div
                        key={sale.id}
                        className={`border rounded-xl p-4 ${col.color} ${col.bg} ${
                          col.key === 'pending' ? 'animate-pulse-subtle' : ''
                        }`}
                      >
                        {/* Table number — displayed prominently if present */}
                        {sale.table_number && (
                          <div className={`flex items-center justify-center gap-2 mb-3 py-2 rounded-xl ${col.headerBg}`}>
                            <span className="text-2xl">🪑</span>
                            <span className={`text-2xl font-black ${col.text}`}>
                              {t('kitchen.table')} {sale.table_number}
                            </span>
                          </div>
                        )}
                        {/* Order number + time */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-white text-sm">
                            #{sale.id.slice(-4).toUpperCase()}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                              isOld ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            <Clock size={12} />
                            {sale.created_at ? timeAgo(sale.created_at) : ''}
                          </span>
                        </div>

                        {/* Dish list */}
                        <div className="space-y-1.5 mb-4">
                          {(sale.items ?? []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-white">
                                {item.quantity}x{' '}
                                {item.dish ? getLocalizedName(item.dish, language) : item.dish_id.slice(-4)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => handleMove(sale, col.next)}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                            col.key === 'pending'
                              ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : col.key === 'preparing'
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {t(`kitchen.${col.action}`)}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
