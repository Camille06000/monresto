import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { usePurchases } from '../hooks/usePurchases';
import { useProducts } from '../hooks/useProducts';
import { useSuppliers } from '../hooks/useSuppliers';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Product } from '../lib/types';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';

type PurchaseFormValues = {
  supplier_id?: string | null;
  purchase_date: string;
  notes?: string;
  invoiceFile?: FileList;
  items: { product_id: string; quantity: number; unit_price: number }[];
};

type SupplierFormValues = {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
};

export function Purchases() {
  const { t } = useTranslation();
  const { language } = useStore();
  const navigate = useNavigate();
  const { purchases, create } = usePurchases();
  const { products } = useProducts();
  const { suppliers, create: createSupplier } = useSuppliers();
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const form = useForm<PurchaseFormValues>({
    defaultValues: {
      supplier_id: '',
      purchase_date: new Date().toISOString().slice(0, 10),
      items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    },
  });

  const supplierForm = useForm<SupplierFormValues>({
    defaultValues: { name: '', contact_name: '', phone: '', email: '' },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const showProductCta = !products.isLoading && (products.data?.length ?? 0) === 0;

  const onSubmit = async (values: PurchaseFormValues) => {
    try {
      await create.mutateAsync({
        supplier_id: values.supplier_id || null,
        purchase_date: values.purchase_date,
        notes: values.notes,
        items: values.items,
        invoiceFile: values.invoiceFile?.[0],
      });
      toast.success(t('actions.validatePurchase'));
      form.reset({
        supplier_id: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      toast.error(message);
    }
  };

  const onSubmitSupplier = async (values: SupplierFormValues) => {
    try {
      const newSupplier = await createSupplier.mutateAsync(values);
      toast.success(t('alerts.success'));
      supplierForm.reset();
      setShowSupplierForm(false);
      // Select the newly created supplier
      form.setValue('supplier_id', newSupplier.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('actions.newPurchase')}</p>
          <h1 className="text-2xl font-bold text-white">{t('purchases.title')}</h1>
        </div>
        <Button onClick={() => append({ product_id: '', quantity: 1, unit_price: 0 })} variant="secondary">
          {t('purchases.addProduct')}
        </Button>
      </div>

      {showProductCta && (
        <div className="glass rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">{t('products.emptyCta')}</p>
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            {t('products.add')}
          </Button>
        </div>
      )}

      {/* Supplier creation modal */}
      {showSupplierForm && (
        <Card title={t('suppliers.add')}>
          <form className="space-y-3" onSubmit={supplierForm.handleSubmit(onSubmitSupplier)}>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">{t('suppliers.addDescription')}</p>
              <button type="button" onClick={() => setShowSupplierForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('suppliers.name')}
                {...supplierForm.register('name', { required: true })}
                error={supplierForm.formState.errors.name?.message}
              />
              <Input label={t('suppliers.contact')} {...supplierForm.register('contact_name')} />
              <Input label={t('suppliers.phone')} {...supplierForm.register('phone')} />
              <Input label={t('suppliers.email')} type="email" {...supplierForm.register('email')} />
            </div>
            <Button type="submit" variant="primary" disabled={createSupplier.isPending}>
              {createSupplier.isPending ? t('common.loading') : t('actions.save')}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select label={t('purchases.supplier')} {...form.register('supplier_id')}>
                  <option value="">{t('forms.selectOption')}</option>
                  {suppliers.data?.map((s) => (
                    <option key={s.id} value={s.id} className="text-black">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowSupplierForm(true)}
                className="h-12 w-12 flex items-center justify-center"
              >
                <Plus size={20} />
              </Button>
            </div>
            <Input label={t('purchases.date')} type="date" {...form.register('purchase_date', { required: true })} />
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="glass p-3 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <Select
                  label={t('purchases.product')}
                  {...form.register(`items.${index}.product_id` as const, { required: true })}
                >
                  <option value="">{t('forms.selectOption')}</option>
                  {products.data?.map((p: Product) => (
                    <option key={p.id} value={p.id} className="text-black">
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('purchases.quantity')}
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                />
                <Input
                  label={t('purchases.unitPrice')}
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.unit_price` as const, { valueAsNumber: true })}
                />
                <div className="text-sm text-gray-200">
                  <p className="text-xs uppercase tracking-wide text-gray-400">{t('purchases.total')}</p>
                  <p className="font-semibold">
                    {formatCurrency(
                      (form.watch(`items.${index}.quantity`) ?? 0) * (form.watch(`items.${index}.unit_price`) ?? 0),
                      'THB',
                      language,
                    )}
                  </p>
                </div>
                <Button variant="ghost" type="button" onClick={() => remove(index)} className="text-danger">
                  {t('actions.delete')}
                </Button>
              </div>
            ))}
          </div>

          <Input label={t('purchases.invoice')} type="file" accept="image/*" {...form.register('invoiceFile')} />
          <Input label={t('purchases.notes')} {...form.register('notes')} />

          <Button type="submit" block variant="primary" disabled={create.isPending}>
            {create.isPending ? t('common.loading') : t('actions.validatePurchase')}
          </Button>
        </form>
      </Card>

      <Card title={t('purchases.listTitle')}>
        <div className="space-y-3">
          {purchases.data?.length === 0 && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
          {purchases.data?.map((purchase) => (
            <div key={purchase.id} className="flex items-center justify-between glass rounded-xl p-3">
              <div>
                <p className="font-semibold text-white">{purchase.supplier?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">{purchase.purchase_date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">
                  {formatCurrency(purchase.total_amount ?? 0, 'THB', language)}
                </p>
                <p className="text-xs text-gray-400">
                  {purchase.items?.length ?? 0} {t('purchases.lines')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
