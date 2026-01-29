import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockRow } from '../lib/types';

const STOCK_KEY = ['stock'];

export function useStock() {
  const queryClient = useQueryClient();

  const stock = useQuery({
    queryKey: STOCK_KEY,
    queryFn: async (): Promise<StockRow[]> => {
      const { data, error } = await supabase
        .from('mv_current_stock')
        .select('product_id,current_quantity,reorder_level,needs_reorder, product:products(*)')
        .order('needs_reorder', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StockRow[];
    },
  });

  const adjust = useMutation({
    mutationFn: async (params: { product_id: string; quantity: number; reason?: string; adjustment_type: string }) => {
      const { error } = await supabase.from('stock_adjustments').insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_KEY });
    },
  });

  return { stock, adjust };
}
