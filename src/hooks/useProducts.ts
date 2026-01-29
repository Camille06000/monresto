import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';

const PRODUCTS_KEY = ['products'];

export function useProducts(search?: string) {
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: [...PRODUCTS_KEY, search ?? 'all'],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from('products').select('*').order('name');
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Product>) => {
      const { data, error } = await supabase.from('products').upsert(payload).select().single();
      if (error) throw error;
      return data as Product;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTS_KEY });
      const previous = queryClient.getQueryData<Product[]>(PRODUCTS_KEY);
      if (previous) {
        const next = [...previous];
        const idx = next.findIndex((p) => p.id === payload.id);
        if (idx >= 0) next[idx] = { ...next[idx], ...payload } as Product;
        else next.unshift(payload as Product);
        queryClient.setQueryData(PRODUCTS_KEY, next);
      }
      return { previous };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PRODUCTS_KEY, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTS_KEY });
      const previous = queryClient.getQueryData<Product[]>(PRODUCTS_KEY);
      if (previous) {
        queryClient.setQueryData(
          PRODUCTS_KEY,
          previous.filter((p) => p.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PRODUCTS_KEY, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });

  return {
    products,
    upsert,
    remove,
  };
}
