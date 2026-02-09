import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Restaurant, RestaurantMember } from '../lib/types';

const RESTAURANTS_KEY = ['restaurants'];

export function useRestaurants() {
  const queryClient = useQueryClient();

  // Get all restaurants the user is a member of
  const restaurants = useQuery({
    queryKey: RESTAURANTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Restaurant[];
    },
  });

  // Get current restaurant from profile
  const currentRestaurant = useQuery({
    queryKey: [...RESTAURANTS_KEY, 'current'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_restaurant_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.current_restaurant_id) return null;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.current_restaurant_id)
        .single();

      if (error) throw error;
      return data as Restaurant;
    },
  });

  // Create a new restaurant
  const create = useMutation({
    mutationFn: async (payload: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_restaurant', {
        p_name: payload.name,
        p_address: payload.address || null,
        p_phone: payload.phone || null,
        p_email: payload.email || null,
      });

      if (error) throw error;

      // Fetch the created restaurant
      const { data: restaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;
      return restaurant as Restaurant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESTAURANTS_KEY });
    },
  });

  // Update a restaurant
  const update = useMutation({
    mutationFn: async (payload: Partial<Restaurant> & { id: string }) => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Restaurant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESTAURANTS_KEY });
    },
  });

  // Switch to a different restaurant
  const switchRestaurant = useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase.rpc('switch_restaurant', {
        p_restaurant_id: restaurantId,
      });

      if (error) throw error;
      return restaurantId;
    },
    onSuccess: () => {
      // Invalidate everything when switching restaurants
      queryClient.invalidateQueries();
    },
  });

  // Get restaurant members
  const getMembers = (restaurantId: string) =>
    useQuery({
      queryKey: [...RESTAURANTS_KEY, restaurantId, 'members'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('restaurant_members')
          .select(`
            *,
            profile:profiles(id, full_name, role)
          `)
          .eq('restaurant_id', restaurantId)
          .order('joined_at');

        if (error) throw error;
        return data as (RestaurantMember & { profile: { id: string; full_name: string; role: string } })[];
      },
      enabled: !!restaurantId,
    });

  return {
    restaurants,
    currentRestaurant,
    create,
    update,
    switchRestaurant,
    getMembers,
  };
}
