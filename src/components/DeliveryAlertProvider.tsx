import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeliveryOrders } from '../hooks/useDeliveryOrders';
import { useStore } from '../store/useStore';
import { playAlarm, initAudioUnlock } from '../lib/sound';

// Déverrouille l'audio dès le chargement (nécessaire mobile iOS/Android)
initAudioUnlock();

export function DeliveryAlertProvider() {
  const { currentRestaurant } = useStore();
  const navigate = useNavigate();
  const { orders } = useDeliveryOrders();

  const [muted, setMuted] = useState(
    () => localStorage.getItem('deliveryAlertMuted') === 'true',
  );

  const prevCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Commandes en attente de collecte (nouvelles OU pending_pickup)
  const pendingOrders = useMemo(
    () =>
      (orders.data ?? []).filter(
        (o) => o.delivery_status === 'pending_pickup' || o.delivery_status === null,
      ),
    [orders.data],
  );

  // Bip immédiat dès qu'une nouvelle commande livraison arrive
  useEffect(() => {
    if (pendingOrders.length > prevCount.current && !muted) {
      playAlarm('delivery');
    }
    prevCount.current = pendingOrders.length;
  }, [pendingOrders.length, muted]);

  // Répétition toutes les 30 secondes si des commandes sont en attente
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!muted && pendingOrders.length > 0) {
        playAlarm('delivery');
      }
    }, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [muted, pendingOrders.length]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem('deliveryAlertMuted', String(next));
      return next;
    });
  };

  // N'afficher que si restaurant chargé ET commandes en attente
  if (!currentRestaurant || pendingOrders.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-white shadow-xl shadow-orange-500/40 animate-pulse">
      {/* Clic sur le badge → aller sur /delivery */}
      <button
        onClick={() => navigate('/delivery')}
        className="flex items-center gap-2 outline-none"
        aria-label="Voir les livraisons en attente"
      >
        <Truck size={16} />
        <span className="font-bold text-sm">{pendingOrders.length}</span>
      </button>

      {/* Bouton muet séparé */}
      <button
        onClick={toggleMute}
        className="ml-0.5 opacity-80 hover:opacity-100 transition-opacity outline-none"
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
      >
        {muted ? <BellOff size={14} /> : <Bell size={14} />}
      </button>
    </div>
  );
}
