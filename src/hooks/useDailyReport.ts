import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DailyDishSale, DailyProductConsumption, DailySummaryEnhanced } from '../lib/types';

const DAILY_REPORT_KEY = ['daily_report'];

export function useDailyReport(date: string) {
  const dishSales = useQuery({
    queryKey: [...DAILY_REPORT_KEY, 'dishes', date],
    queryFn: async (): Promise<DailyDishSale[]> => {
      const { data, error } = await supabase
        .from('v_daily_dish_sales')
        .select('*')
        .eq('sale_day', date)
        .order('total_quantity', { ascending: false });
      if (error) throw error;
      return data as DailyDishSale[];
    },
  });

  const productConsumption = useQuery({
    queryKey: [...DAILY_REPORT_KEY, 'products', date],
    queryFn: async (): Promise<DailyProductConsumption[]> => {
      const { data, error } = await supabase
        .from('v_daily_product_consumption')
        .select('*')
        .eq('sale_day', date)
        .order('total_consumed', { ascending: false });
      if (error) throw error;
      return data as DailyProductConsumption[];
    },
  });

  const summary = useQuery({
    queryKey: [...DAILY_REPORT_KEY, 'summary', date],
    queryFn: async (): Promise<DailySummaryEnhanced | null> => {
      const { data, error } = await supabase
        .from('v_daily_summary_enhanced')
        .select('*')
        .eq('sale_day', date)
        .maybeSingle();
      if (error) throw error;
      return data as DailySummaryEnhanced | null;
    },
  });

  return { dishSales, productConsumption, summary };
}
