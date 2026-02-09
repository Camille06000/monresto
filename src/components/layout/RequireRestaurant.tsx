import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import type { Restaurant } from '../../lib/types';

export function RequireRestaurant() {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentRestaurant, setCurrentRestaurant } = useStore();
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function loadCurrentRestaurant() {
      // If we already have a restaurant in store, we're good
      if (currentRestaurant) {
        setLoading(false);
        setChecked(true);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          setChecked(true);
          return;
        }

        // Get profile with current_restaurant_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_restaurant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.current_restaurant_id) {
          console.log('No current_restaurant_id in profile');
          setLoading(false);
          setChecked(true);
          return;
        }

        // Fetch the restaurant directly
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profile.current_restaurant_id)
          .single();

        if (restaurantError) {
          console.error('Error fetching restaurant:', restaurantError);
          setLoading(false);
          setChecked(true);
          return;
        }

        if (restaurant) {
          console.log('Setting restaurant:', restaurant.name);
          setCurrentRestaurant(restaurant as Restaurant);
        }
      } catch (error) {
        console.error('Error in loadCurrentRestaurant:', error);
      } finally {
        setLoading(false);
        setChecked(true);
      }
    }

    loadCurrentRestaurant();
  }, [currentRestaurant, setCurrentRestaurant]);

  // If we're on the restaurant selection page, always render
  if (location.pathname === '/restaurant') {
    return <Outlet />;
  }

  // Show loading while checking
  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-[#0b1220]">
        <Loader2 className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  // If no restaurant, redirect to selection
  if (!currentRestaurant) {
    return <Navigate to="/restaurant" replace />;
  }

  return <Outlet />;
}
