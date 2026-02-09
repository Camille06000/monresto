import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { Supplier } from '../lib/types';

const SUPPLIERS_KEY = ['suppliers'];

export function useSuppliers() {
  const queryClient = useQueryClient();
  const { currentRestaurant } = useStore();
  const restaurantId = currentRestaurant?.id;

  const suppliers = useQuery({
    queryKey: [...SUPPLIERS_KEY, restaurantId],
    queryFn: async (): Promise<Supplier[]> => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!restaurantId,
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
      const dataWithRestaurant = restaurantId ? { ...payload, restaurant_id: restaurantId } : payload;
      const { data, error } = await supabase
        .from('suppliers')
        .insert(dataWithRestaurant)
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  const update = useMutation({
    mutationFn: async (payload: Partial<Supplier> & { id: string }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('suppliers')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  return { suppliers, create, update, remove };
}
