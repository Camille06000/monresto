import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Building2, ChevronRight, MapPin } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Restaurant } from '../lib/types';

type RestaurantFormValues = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

export function RestaurantSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { restaurants, create, switchRestaurant } = useRestaurants();
  const { setCurrentRestaurant } = useStore();
  const [showForm, setShowForm] = useState(false);

  const form = useForm<RestaurantFormValues>({
    defaultValues: { name: '', address: '', phone: '', email: '' },
  });

  const handleSelect = async (restaurant: Restaurant) => {
    try {
      await switchRestaurant.mutateAsync(restaurant.id);
      setCurrentRestaurant(restaurant);
      toast.success(t('restaurant.switched', { name: restaurant.name }));
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      toast.error(message);
    }
  };

  const onSubmit = async (values: RestaurantFormValues) => {
    try {
      const newRestaurant = await create.mutateAsync(values);
      setCurrentRestaurant(newRestaurant);
      toast.success(t('restaurant.created'));
      form.reset();
      setShowForm(false);
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      toast.error(message);
    }
  };

  const hasRestaurants = (restaurants.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-4">
            <Building2 size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('restaurant.selectTitle')}</h1>
          <p className="text-gray-400 mt-2">{t('restaurant.selectDescription')}</p>
        </div>

        {/* Restaurant List */}
        {hasRestaurants && !showForm && (
          <Card title={t('restaurant.yourRestaurants')}>
            <div className="space-y-3">
              {restaurants.data?.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => handleSelect(restaurant)}
                  disabled={switchRestaurant.isPending}
                  className="w-full flex items-center justify-between glass rounded-xl p-4 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Building2 size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{restaurant.name}</p>
                      {restaurant.address && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} />
                          {restaurant.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Create Form */}
        {showForm ? (
          <Card title={t('restaurant.createNew')}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <Input
                label={t('restaurant.name')}
                placeholder={t('restaurant.namePlaceholder')}
                {...form.register('name', { required: true })}
                error={form.formState.errors.name?.message}
              />
              <Input
                label={t('restaurant.address')}
                placeholder={t('restaurant.addressPlaceholder')}
                {...form.register('address')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('restaurant.phone')}
                  placeholder="+66..."
                  {...form.register('phone')}
                />
                <Input
                  label={t('restaurant.email')}
                  type="email"
                  placeholder="contact@..."
                  {...form.register('email')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  {t('actions.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={create.isPending}
                  className="flex-1"
                >
                  {create.isPending ? t('common.loading') : t('restaurant.create')}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button
            variant="secondary"
            block
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {t('restaurant.createNew')}
          </Button>
        )}

        {/* Loading state */}
        {restaurants.isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 mt-2">{t('common.loading')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
