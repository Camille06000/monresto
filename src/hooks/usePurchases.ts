import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, uploadToBucket } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { Purchase } from '../lib/types';

const PURCHASES_KEY = ['purchases'];

export interface PurchasePayload {
  supplier_id?: string | null;
  purchase_date: string;
  items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  invoiceFile?: File | null;
  notes?: string;
}

export function usePurchases() {
  const queryClient = useQueryClient();
  const { currentRestaurant } = useStore();
  const restaurantId = currentRestaurant?.id;

  const purchases = useQuery({
    queryKey: [...PURCHASES_KEY, restaurantId],
    queryFn: async (): Promise<Purchase[]> => {
      let query = supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), items:purchase_items(id, product_id, quantity, unit_price, total_price, product:products(*))')
        .order('purchase_date', { ascending: false });

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Purchase[];
    },
    enabled: !!restaurantId,
  });

  const create = useMutation({
    mutationFn: async (payload: PurchasePayload) => {
      let invoice_url: string | undefined;
      if (payload.invoiceFile) {
        invoice_url = await uploadToBucket({ bucket: 'invoices', file: payload.invoiceFile, pathPrefix: 'purchases' });
      }

      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
          supplier_id: payload.supplier_id ?? null,
          purchase_date: payload.purchase_date,
          invoice_url,
          notes: payload.notes ?? null,
          restaurant_id: restaurantId,
        })
        .select()
        .single();
      if (error) throw error;

      const items = payload.items.map((item) => ({
        ...item,
        purchase_id: purchase.id,
      }));
      const { error: itemsError } = await supabase.from('purchase_items').insert(items);
      if (itemsError) throw itemsError;

      const { data: fullPurchase, error: fetchError } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), items:purchase_items(id, product_id, quantity, unit_price, total_price, product:products(*))')
        .eq('id', purchase.id)
        .single();
      if (fetchError) throw fetchError;
      return fullPurchase as Purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASES_KEY });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const update = useMutation({
    mutationFn: async (payload: PurchasePayload & { id: string }) => {
      let invoice_url: string | undefined;
      if (payload.invoiceFile) {
        invoice_url = await uploadToBucket({ bucket: 'invoices', file: payload.invoiceFile, pathPrefix: 'purchases' });
      }

      const updateData: Record<string, unknown> = {
        supplier_id: payload.supplier_id ?? null,
        purchase_date: payload.purchase_date,
        notes: payload.notes ?? null,
      };
      if (invoice_url) updateData.invoice_url = invoice_url;

      const { error } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', payload.id);
      if (error) throw error;

      // Delete old items and insert new ones
      const { error: deleteError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', payload.id);
      if (deleteError) throw deleteError;

      const items = payload.items.map((item) => ({
        ...item,
        purchase_id: payload.id,
      }));
      const { error: itemsError } = await supabase.from('purchase_items').insert(items);
      if (itemsError) throw itemsError;

      const { data: fullPurchase, error: fetchError } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), items:purchase_items(id, product_id, quantity, unit_price, total_price, product:products(*))')
        .eq('id', payload.id)
        .single();
      if (fetchError) throw fetchError;
      return fullPurchase as Purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASES_KEY });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Delete items first (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', id);
      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASES_KEY });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  return { purchases, create, update, remove };
}
