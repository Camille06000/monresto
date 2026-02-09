import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useRestaurants } from '../../hooks/useRestaurants';

export function RequireRestaurant() {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentRestaurant, setCurrentRestaurant } = useStore();
  const { currentRestaurant: fetchedRestaurant, restaurants } = useRestaurants();

  // Sync the fetched restaurant with the store
  useEffect(() => {
    if (fetchedRestaurant.data && !currentRestaurant) {
      setCurrentRestaurant(fetchedRestaurant.data);
    }
  }, [fetchedRestaurant.data, currentRestaurant, setCurrentRestaurant]);

  // If we're already on the restaurant selection page, just render the outlet
  if (location.pathname === '/restaurant') {
    return <Outlet />;
  }

  // Show loading while checking for restaurant
  if (fetchedRestaurant.isLoading || restaurants.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <Loader2 className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  // If no restaurant selected and user has restaurants, redirect to selection
  if (!currentRestaurant && !fetchedRestaurant.data) {
    return <Navigate to="/restaurant" replace />;
  }

  return <Outlet />;
}
