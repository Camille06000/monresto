import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useProducts } from '../hooks/useProducts';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';

type ProductForm = {
  id?: string;
  name: string;
  name_th?: string;
  name_en?: string;
  unit: string;
  category?: string;
  reorder_level?: number;
  last_price?: number;
};

export function Products() {
  const { t } = useTranslation();
  const { language } = useStore();
  const { products, upsert, remove } = useProducts();
  const { register, handleSubmit, reset } = useForm<ProductForm>({
    defaultValues: { name: '', name_en: '', name_th: '', unit: 'kg', reorder_level: 0, last_price: 0 },
  });

  const onSubmit = async (values: ProductForm) => {
    try {
      await upsert.mutateAsync(values);
      toast.success(t('actions.save'));
      reset({ name: '', name_en: '', name_th: '', unit: 'kg', reorder_level: 0, last_price: 0 });
    } catch (error: any) {
      toast.error(error.message ?? t('alerts.error'));
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('products.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('products.title')}</h1>
        </div>
      </div>

      <Card title={t('products.add')}>
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3" onSubmit={handleSubmit(onSubmit)}>
          <Input label="FR" {...register('name', { required: true })} />
          <Input label="TH" {...register('name_th')} />
          <Input label="EN" {...register('name_en')} />
          <Input label={t('products.unit')} {...register('unit', { required: true })} />
          <Input
            label={t('products.reorderLevel')}
            type="number"
            step="0.1"
            {...register('reorder_level', { valueAsNumber: true })}
          />
          <Input
            label={t('products.lastPrice')}
            type="number"
            step="0.1"
            {...register('last_price', { valueAsNumber: true })}
          />
          <Input label={t('products.category')} {...register('category')} />
          <Button type="submit" variant="primary" className="sm:col-span-3">
            {t('actions.save')}
          </Button>
        </form>
      </Card>

      <Card title={t('products.title')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.data?.map((p) => (
            <div key={p.id} className="glass rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-xs text-gray-400">
                  {p.unit} • {t('products.reorderLevel')}: {p.reorder_level ?? 0}
                </p>
                <p className="text-xs text-gray-400">
                  {t('products.lastPrice')}: {formatCurrency(p.last_price ?? 0, 'THB', language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">{p.category ?? '—'}</Badge>
                <Button variant="ghost" onClick={() => remove.mutateAsync(p.id)}>
                  {t('actions.delete')}
                </Button>
              </div>
            </div>
          ))}
          {!products.data?.length && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
        </div>
      </Card>
    </div>
  );
}
