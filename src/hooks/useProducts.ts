import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';

const PRODUCTS_KEY = ['products'];
type RemoveResult = { id: string; archived: boolean };

export function useProducts(search?: string) {
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: [...PRODUCTS_KEY, search ?? 'all'],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from('products').select('*').eq('is_active', true).order('name');
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

  const bulkUpsert = useMutation({
    mutationFn: async (payload: Array<Partial<Product>>) => {
      if (!payload.length) return [];
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'barcode' });
      if (error) throw error;
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<RemoveResult> => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return { id, archived: false };
      const isFkError = error.code === '23503' || error.message?.toLowerCase().includes('foreign key');
      if (isFkError) {
        const { error: archiveError } = await supabase.from('products').update({ is_active: false }).eq('id', id);
        if (archiveError) throw archiveError;
        return { id, archived: true };
      }
      throw error;
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
    bulkUpsert,
    remove,
  };
}
