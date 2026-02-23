import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { DeliveryStatus, Sale } from '../lib/types';

const DELIVERY_KEY = ['delivery-orders'];

export function useDeliveryOrders() {
  const queryClient = useQueryClient();
  const { currentRestaurant } = useStore();
  const restaurantId = currentRestaurant?.id;

  const orders = useQuery({
    queryKey: [...DELIVERY_KEY, restaurantId],
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, items:sale_items(id, dish_id, quantity, unit_price, dish:dishes(*))')
        .eq('restaurant_id', restaurantId!)
        .eq('order_type', 'delivery')
        .neq('delivery_status', 'delivered')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Sale[];
    },
    refetchInterval: 10_000,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    networkMode: 'always',
    enabled: !!restaurantId,
  });

  const assignDriver = useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string | null }) => {
      const { error } = await supabase
        .from('sales')
        .update({ assigned_driver_id: driverId })
        .eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
    },
  });

  const updateDeliveryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeliveryStatus }) => {
      const { error } = await supabase
        .from('sales')
        .update({ delivery_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [...DELIVERY_KEY, restaurantId] });
      const previous = queryClient.getQueryData<Sale[]>([...DELIVERY_KEY, restaurantId]);

      queryClient.setQueryData<Sale[]>([...DELIVERY_KEY, restaurantId], (old) => {
        if (!old) return old;
        if (status === 'delivered') {
          return old.filter((s) => s.id !== id);
        }
        return old.map((s) =>
          s.id === id ? { ...s, delivery_status: status } : s
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DELIVERY_KEY, restaurantId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  return { orders, assignDriver, updateDeliveryStatus };
}

/** Hook for the driver view — fetches only deliveries assigned to the current user */
export function useMyDeliveries() {
  const queryClient = useQueryClient();

  const deliveries = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: async (): Promise<Sale[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sales')
        .select('*, items:sale_items(id, dish_id, quantity, unit_price, dish:dishes(*))')
        .eq('assigned_driver_id', user.id)
        .neq('delivery_status', 'delivered')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Sale[];
    },
    refetchInterval: 10_000,
    staleTime: 0,
    networkMode: 'always',
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeliveryStatus }) => {
      const { error } = await supabase
        .from('sales')
        .update({ delivery_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['my-deliveries'] });
      const previous = queryClient.getQueryData<Sale[]>(['my-deliveries']);

      queryClient.setQueryData<Sale[]>(['my-deliveries'], (old) => {
        if (!old) return old;
        if (status === 'delivered') {
          return old.filter((s) => s.id !== id);
        }
        return old.map((s) =>
          s.id === id ? { ...s, delivery_status: status } : s
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['my-deliveries'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
    },
  });

  return { deliveries, updateStatus };
}
