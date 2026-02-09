import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { Sale } from '../lib/types';

const SALES_KEY = ['sales'];

export interface SalePayload {
  items: Array<{ dish_id: string; quantity: number; unit_price: number }>;
}

// Custom error class for insufficient stock
export class InsufficientStockError extends Error {
  productId: string;
  missing: number;

  constructor(productId: string, missing: number) {
    super(`INSUFFICIENT_STOCK`);
    this.name = 'InsufficientStockError';
    this.productId = productId;
    this.missing = missing;
  }
}

// Parse PostgreSQL error for stock validation
function parseStockError(error: { message?: string; code?: string; details?: string }): Error {
  if (error.message?.includes('INSUFFICIENT_STOCK')) {
    // Extract product_id and missing quantity from error message
    const match = error.message.match(/product\s+([a-f0-9-]+)\s+\(missing\s+([\d.]+)\)/i);
    if (match) {
      return new InsufficientStockError(match[1], parseFloat(match[2]));
    }
    return new InsufficientStockError('unknown', 0);
  }
  return new Error(error.message ?? 'Unknown error');
}

export function useSales() {
  const queryClient = useQueryClient();
  const { currentRestaurant } = useStore();
  const restaurantId = currentRestaurant?.id;

  const sales = useQuery({
    queryKey: [...SALES_KEY, restaurantId],
    queryFn: async (): Promise<Sale[]> => {
      let query = supabase
        .from('sales')
        .select('*, items:sale_items(id, dish_id, quantity, unit_price, total_price, dish:dishes(*))')
        .order('sale_date', { ascending: false })
        .limit(50);

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Sale[];
    },
    enabled: !!restaurantId,
  });

  const create = useMutation({
    mutationFn: async (payload: SalePayload) => {
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({ restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw parseStockError(error);

      const items = payload.items.map((item) => ({ ...item, sale_id: sale.id }));
      const { error: itemsError } = await supabase.from('sale_items').insert(items);

      if (itemsError) {
        // Rollback: delete the sale if items insertion fails
        await supabase.from('sales').delete().eq('id', sale.id);
        throw parseStockError(itemsError);
      }

      const { data: fullSale, error: fetchError } = await supabase
        .from('sales')
        .select('*, items:sale_items(id, dish_id, quantity, unit_price, total_price, dish:dishes(*))')
        .eq('id', sale.id)
        .single();
      if (fetchError) throw fetchError;
      return fullSale as Sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KEY });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { sales, create, InsufficientStockError };
}
