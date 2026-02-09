import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDishes } from '../hooks/useDishes';
import { useProducts } from '../hooks/useProducts';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { calcMargin, calcDishCost, formatCurrency } from '../lib/utils';
import { uploadToBucket } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Dish } from '../lib/types';

type DishForm = {
  name: string;
  name_th?: string;
  name_en?: string;
  price: number;
  ingredients: { product_id: string; quantity: number }[];
};

export function Dishes() {
  const { t } = useTranslation();
  const { language, profile } = useStore();
  const navigate = useNavigate();
  const { dishes, upsertDish, setIngredients, remove } = useDishes();
  const { products } = useProducts();
  const [editing, setEditing] = useState<Dish | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const form = useForm<DishForm>({
    defaultValues: {
      name: '',
      name_th: '',
      name_en: '',
      price: 0,
      ingredients: [{ product_id: '', quantity: 0 }],
    },
  });
  const { fields, append, remove: removeIngredient, replace } = useFieldArray({ control: form.control, name: 'ingredients' });

  useEffect(() => {
    if (!photoFile) {
      if (!editing?.photo_url) setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile, editing?.photo_url]);

  const canManage = profile?.role === 'admin' || profile?.role === 'manager';
  const isSaving = upsertDish.isPending || setIngredients.isPending;

  const resetForm = () => {
    form.reset({
      name: '',
      name_th: '',
      name_en: '',
      price: 0,
      ingredients: [{ product_id: '', quantity: 0 }],
    });
    setEditing(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoInputKey((prev) => prev + 1);
  };

  const handleEdit = (dish: Dish) => {
    setEditing(dish);
    const dishData = dishes.data?.find((d) => d.id === dish.id);
    const ingredients = (dishData as any)?.dish_ingredients?.map((ing: any) => ({
      product_id: ing.product_id,
      quantity: ing.quantity,
    })) ?? [{ product_id: '', quantity: 0 }];

    form.reset({
      name: dish.name,
      name_th: dish.name_th ?? '',
      name_en: dish.name_en ?? '',
      price: dish.price,
      ingredients: ingredients.length > 0 ? ingredients : [{ product_id: '', quantity: 0 }],
    });
    replace(ingredients.length > 0 ? ingredients : [{ product_id: '', quantity: 0 }]);

    if (dish.photo_url) {
      setPhotoPreview(dish.photo_url);
    }
  };

  const onSubmit = async (values: DishForm) => {
    try {
      let photo_url: string | undefined;
      if (photoFile) {
        photo_url = await uploadToBucket({ bucket: 'dishes', file: photoFile, pathPrefix: 'dishes' });
      } else if (editing?.photo_url) {
        photo_url = editing.photo_url;
      }

      const dishPayload: any = {
        name: values.name,
        name_en: values.name_en,
        name_th: values.name_th,
        price: values.price,
        is_active: true,
      };
      if (photo_url) dishPayload.photo_url = photo_url;
      if (editing) dishPayload.id = editing.id;

      const dish = await upsertDish.mutateAsync(dishPayload);
      await setIngredients.mutateAsync({
        dishId: dish.id,
        ingredients: values.ingredients
          .filter((ing) => ing.product_id)
          .map((ing) => ({ dish_id: dish.id, product_id: ing.product_id, quantity: ing.quantity })),
      });
      toast.success(editing ? t('actions.save') : t('actions.newDish'));
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('actions.confirmDelete'))) return;
    try {
      const result = await remove.mutateAsync(id);
      if (result.archived) {
        toast.success(t('alerts.archived'));
      } else {
        toast.success(t('actions.delete'));
      }
      if (editing?.id === id) resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  const cost = calcDishCost(form.watch('ingredients') as any, products.data ?? []);
  const price = form.watch('price');
  const margin = calcMargin(price, cost);
  const showProductCta = !products.isLoading && (products.data?.length ?? 0) === 0;

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('dishes.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('dishes.title')}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => append({ product_id: '', quantity: 0 })}
          disabled={!canManage}
        >
          {t('dishes.addIngredient')}
        </Button>
      </div>

      {!canManage && (
        <div className="glass rounded-xl p-4 text-sm text-gray-200">{t('alerts.adminOnly')}</div>
      )}

      {showProductCta && (
        <div className="glass rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">{t('products.emptyCta')}</p>
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            {t('products.add')}
          </Button>
        </div>
      )}

      <Card title={editing ? t('actions.edit') : t('actions.newDish')}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          {editing && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={resetForm}>
                <X size={16} className="mr-1" /> {t('actions.cancel')}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label={`${t('dishes.name')} (FR)`} {...form.register('name', { required: true })} disabled={!canManage || isSaving} />
            <Input label={`${t('dishes.name')} (TH)`} {...form.register('name_th')} disabled={!canManage || isSaving} />
            <Input label={`${t('dishes.name')} (EN)`} {...form.register('name_en')} disabled={!canManage || isSaving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={t('dishes.price')}
              type="number"
              step="0.1"
              {...form.register('price', { valueAsNumber: true })}
              disabled={!canManage || isSaving}
            />
            <label className="flex flex-col gap-1 text-sm text-gray-200 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">{t('dishes.photo')}</span>
              <input
                key={photoInputKey}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                disabled={!canManage || isSaving}
              />
            </label>
          </div>
          {photoPreview && (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt={t('dishes.photo')} className="h-16 w-16 rounded-xl object-cover border border-white/10" />
              <span className="text-xs text-gray-400">{t('dishes.photoReady')}</span>
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="glass rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <Select
                  label={t('purchases.product')}
                  {...form.register(`ingredients.${idx}.product_id` as const, { required: true })}
                  disabled={!canManage || isSaving}
                >
                  <option value="">{t('forms.selectOption')}</option>
                  {products.data?.map((p) => (
                    <option key={p.id} value={p.id} className="text-black">
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('purchases.quantity')}
                  type="number"
                  step="0.01"
                  {...form.register(`ingredients.${idx}.quantity` as const, { valueAsNumber: true })}
                  disabled={!canManage || isSaving}
                />
                <Button variant="ghost" type="button" onClick={() => removeIngredient(idx)} disabled={!canManage || isSaving}>
                  {t('actions.delete')}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Badge tone="info">
              {t('dishes.cost')}: {formatCurrency(cost, 'THB', language)}
            </Badge>
            <Badge tone="success">
              {t('dishes.margin')}: {margin}%
            </Badge>
          </div>

          <Button type="submit" variant="primary" block disabled={!canManage || isSaving}>
            {isSaving ? t('common.loading') : editing ? t('actions.save') : t('actions.newDish')}
          </Button>
        </form>
      </Card>

      <Card title={t('dishes.title')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dishes.data?.map((dish) => (
            <div key={dish.id} className="glass rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-xs text-gray-400">
                  {dish.photo_url ? (
                    <img src={dish.photo_url} alt={dish.name} className="h-full w-full object-cover" />
                  ) : (
                    t('dishes.noPhoto')
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">{dish.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(dish.price, 'THB', language)} - {t('dishes.margin')}: {dish.margin ?? 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">
                  {t('dishes.cost')}: {formatCurrency(dish.cost ?? 0, 'THB', language)}
                </Badge>
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => handleEdit(dish)} disabled={upsertDish.isPending}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(dish.id)} disabled={remove.isPending}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!dishes.data?.length && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
        </div>
      </Card>
    </div>
  );
}
