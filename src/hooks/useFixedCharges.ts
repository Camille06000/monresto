import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FixedCharge } from '../lib/types';

const FIXED_CHARGES_KEY = ['fixed_charges'];

export function useFixedCharges() {
  const queryClient = useQueryClient();

  const charges = useQuery({
    queryKey: FIXED_CHARGES_KEY,
    queryFn: async (): Promise<FixedCharge[]> => {
      const { data, error } = await supabase
        .from('fixed_charges')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FixedCharge[];
    },
  });

  const monthlyTotal = useQuery({
    queryKey: [...FIXED_CHARGES_KEY, 'monthly_total'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_charges');
      if (error) throw error;
      return data ?? 0;
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<FixedCharge, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('fixed_charges')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FixedCharge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIXED_CHARGES_KEY });
    },
  });

  const update = useMutation({
    mutationFn: async (payload: Partial<FixedCharge> & { id: string }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('fixed_charges')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FixedCharge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIXED_CHARGES_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fixed_charges')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIXED_CHARGES_KEY });
    },
  });

  return { charges, monthlyTotal, create, update, remove };
}
