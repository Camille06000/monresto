import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockRow } from '../lib/types';

const DASHBOARD_KEY = ['dashboard'];

export function useDashboard() {
  const dashboard = useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async () => {
      const today = new Date();
      const isoDate = today.toISOString().slice(0, 10);

      const [{ data: summary, error }, { data: topDishes, error: topError }, { data: alerts, error: alertErr }] =
        await Promise.all([
          supabase.from('daily_summaries').select('*').eq('summary_date', isoDate).maybeSingle(),
          supabase
            .from('sale_items')
            .select('dish_id, quantity, total_price, dishes(name, price)')
            .gte('created_at', `${isoDate}T00:00:00Z`)
            .lte('created_at', `${isoDate}T23:59:59Z`),
          supabase.from('mv_current_stock').select('product_id,current_quantity,reorder_level,needs_reorder, product:products(*)'),
        ]);

      if (error) throw error;
      if (topError) throw topError;
      if (alertErr) throw alertErr;

      type TopRow = { dish_id: string; quantity: number; revenue: number; name?: string | null; price?: number | null };
      const groupedTop = new Map<string, TopRow>();
      (topDishes ?? ([] as any[])).forEach((row: any) => {
        const current = groupedTop.get(row.dish_id) ?? {
          dish_id: row.dish_id,
          quantity: 0,
          revenue: 0,
          name: row.dishes?.name,
          price: row.dishes?.price,
        };
        current.quantity += row.quantity;
        current.revenue += row.total_price;
        groupedTop.set(row.dish_id, current);
      });

      const sortedTop = Array.from(groupedTop.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 3);
      const lowStock = ((alerts ?? []) as unknown as StockRow[]).filter((s) => s.needs_reorder);

      return {
        summary,
        top: sortedTop,
        alerts: lowStock,
      };
    },
  });

  return { dashboard };
}
