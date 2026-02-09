import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Dish, DishIngredient } from '../lib/types';

const DISHES_KEY = ['dishes'];
type RemoveResult = { id: string; archived: boolean };

export function useDishes() {
  const queryClient = useQueryClient();

  const dishes = useQuery({
    queryKey: DISHES_KEY,
    queryFn: async (): Promise<Dish[]> => {
      const [{ data: dishesData, error }, { data: costData, error: costError }] = await Promise.all([
        supabase
          .from('dishes')
          .select('*, dish_ingredients(id, product_id, quantity, product:products(*))')
          .eq('is_active', true)
          .order('name'),
        supabase.from('mv_dish_costs').select('dish_id,total_cost'),
      ]);
      if (error) throw error;
      if (costError) throw costError;
      const costMap = new Map<string, number>();
      costData?.forEach((row: { dish_id: string; total_cost: number }) => costMap.set(row.dish_id, row.total_cost));

      return (dishesData ?? []).map((d) => {
        const cost = costMap.get(d.id) ?? 0;
        const margin = d.price ? Math.round(((d.price - cost) / d.price) * 100 * 10) / 10 : 0;
        return { ...d, cost, margin } as Dish;
      });
    },
  });

  const upsertDish = useMutation({
    mutationFn: async (payload: Partial<Dish>) => {
      const { data, error } = await supabase.from('dishes').upsert(payload).select().single();
      if (error) throw error;
      return data as Dish;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISHES_KEY });
    },
  });

  const setIngredients = useMutation({
    mutationFn: async (params: { dishId: string; ingredients: Array<Omit<DishIngredient, 'id'>> }) => {
      const { dishId, ingredients } = params;
      const { error: delError } = await supabase.from('dish_ingredients').delete().eq('dish_id', dishId);
      if (delError) throw delError;
      if (ingredients.length) {
        const insertPayload = ingredients.map((ing) => ({ ...ing, dish_id: dishId }));
        const { error: insError } = await supabase.from('dish_ingredients').insert(insertPayload);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISHES_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<RemoveResult> => {
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (!error) return { id, archived: false };
      const isFkError = error.code === '23503' || error.message?.toLowerCase().includes('foreign key');
      if (isFkError) {
        const { error: archiveError } = await supabase.from('dishes').update({ is_active: false }).eq('id', id);
        if (archiveError) throw archiveError;
        return { id, archived: true };
      }
      throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: DISHES_KEY });
      const previous = queryClient.getQueryData<Dish[]>(DISHES_KEY);
      if (previous) {
        queryClient.setQueryData(
          DISHES_KEY,
          previous.filter((d) => d.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(DISHES_KEY, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DISHES_KEY });
    },
  });

  return { dishes, upsertDish, setIngredients, remove };
}
