import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDishes } from '../hooks/useDishes';
import { useProducts } from '../hooks/useProducts';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { calcMargin, calcDishCost, formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

type DishForm = {
  name: string;
  name_th?: string;
  name_en?: string;
  price: number;
  ingredients: { product_id: string; quantity: number }[];
};

export function Dishes() {
  const { t } = useTranslation();
  const { language } = useStore();
  const { dishes, upsertDish, setIngredients } = useDishes();
  const { products } = useProducts();

  const form = useForm<DishForm>({
    defaultValues: {
      name: '',
      name_th: '',
      name_en: '',
      price: 0,
      ingredients: [{ product_id: '', quantity: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'ingredients' });

  const onSubmit = async (values: DishForm) => {
    try {
      const dish = await upsertDish.mutateAsync({
        name: values.name,
        name_en: values.name_en,
        name_th: values.name_th,
        price: values.price,
        is_active: true,
      });
      await setIngredients.mutateAsync({
        dishId: dish.id,
        ingredients: values.ingredients.map((ing) => ({ dish_id: dish.id, product_id: ing.product_id, quantity: ing.quantity })),
      });
      toast.success(t('actions.newDish'));
      form.reset({
        name: '',
        name_th: '',
        name_en: '',
        price: 0,
        ingredients: [{ product_id: '', quantity: 0 }],
      });
    } catch (error: any) {
      toast.error(error.message ?? t('alerts.error'));
    }
  };

  const cost = calcDishCost(form.watch('ingredients') as any, products.data ?? []);
  const price = form.watch('price');
  const margin = calcMargin(price, cost);

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('dishes.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('dishes.title')}</h1>
        </div>
        <Button variant="secondary" onClick={() => append({ product_id: '', quantity: 0 })}>
          {t('dishes.addIngredient')}
        </Button>
      </div>

      <Card title={t('actions.newDish')}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label={`${t('dishes.name')} (FR)`} {...form.register('name', { required: true })} />
            <Input label={`${t('dishes.name')} (TH)`} {...form.register('name_th')} />
            <Input label={`${t('dishes.name')} (EN)`} {...form.register('name_en')} />
          </div>
          <Input
            label={t('dishes.price')}
            type="number"
            step="0.1"
            {...form.register('price', { valueAsNumber: true })}
          />

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="glass rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <Select
                  label={t('purchases.product')}
                  {...form.register(`ingredients.${idx}.product_id` as const, { required: true })}
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
                />
                <Button variant="ghost" type="button" onClick={() => remove(idx)}>
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

          <Button type="submit" variant="primary" block>
            {t('actions.save')}
          </Button>
        </form>
      </Card>

      <Card title={t('dishes.title')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dishes.data?.map((dish) => (
            <div key={dish.id} className="glass rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{dish.name}</p>
                <p className="text-xs text-gray-400">
                  {formatCurrency(dish.price, 'THB', language)} • {t('dishes.margin')}: {dish.margin ?? 0}%
                </p>
              </div>
              <Badge tone="info">
                {t('dishes.cost')}: {formatCurrency(dish.cost ?? 0, 'THB', language)}
              </Badge>
            </div>
          ))}
          {!dishes.data?.length && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
        </div>
      </Card>
    </div>
  );
}
