import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X } from 'lucide-react';
import { useFixedCharges } from '../hooks/useFixedCharges';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { FixedCharge, ChargeFrequency } from '../lib/types';

type ChargeForm = {
  id?: string;
  name: string;
  amount: number;
  frequency: ChargeFrequency;
  category?: string;
  start_date: string;
  end_date?: string;
  notes?: string;
};

export function FixedCharges() {
  const { t } = useTranslation();
  const { language, profile } = useStore();
  const { charges, monthlyTotal, create, update, remove } = useFixedCharges();
  const [editing, setEditing] = useState<FixedCharge | null>(null);

  const form = useForm<ChargeForm>({
    defaultValues: {
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      notes: '',
    },
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'manager';
  const isSaving = create.isPending || update.isPending;

  const resetForm = () => {
    form.reset({
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      notes: '',
    });
    setEditing(null);
  };

  const handleEdit = (charge: FixedCharge) => {
    setEditing(charge);
    form.reset({
      id: charge.id,
      name: charge.name,
      amount: charge.amount,
      frequency: charge.frequency,
      category: charge.category ?? '',
      start_date: charge.start_date,
      end_date: charge.end_date ?? '',
      notes: charge.notes ?? '',
    });
  };

  const onSubmit = async (values: ChargeForm) => {
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          ...values,
          end_date: values.end_date || null,
        });
        toast.success(t('actions.save'));
      } else {
        await create.mutateAsync({
          ...values,
          end_date: values.end_date || null,
          is_active: true,
        });
        toast.success(t('actions.save'));
      }
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('actions.confirmDelete'))) return;
    try {
      await remove.mutateAsync(id);
      toast.success(t('actions.delete'));
      if (editing?.id === id) resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  const frequencyLabels: Record<ChargeFrequency, string> = {
    daily: t('fixedCharges.frequencies.daily'),
    weekly: t('fixedCharges.frequencies.weekly'),
    monthly: t('fixedCharges.frequencies.monthly'),
    yearly: t('fixedCharges.frequencies.yearly'),
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('fixedCharges.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('fixedCharges.title')}</h1>
        </div>
        <Badge tone="info" className="text-lg px-4 py-2">
          {t('fixedCharges.total')}: {formatCurrency(monthlyTotal.data ?? 0, 'THB', language)}
        </Badge>
      </div>

      {!canManage && (
        <div className="glass rounded-xl p-4 text-sm text-gray-200">{t('alerts.adminOnly')}</div>
      )}

      <Card title={editing ? t('actions.edit') : t('fixedCharges.add')}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {editing && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={resetForm}>
                <X size={16} className="mr-1" /> {t('actions.cancel')}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={t('fixedCharges.name')}
              {...form.register('name', { required: true })}
              disabled={!canManage || isSaving}
            />
            <Input
              label={t('fixedCharges.amount')}
              type="number"
              step="0.01"
              {...form.register('amount', { valueAsNumber: true })}
              disabled={!canManage || isSaving}
            />
            <Select
              label={t('fixedCharges.frequency')}
              {...form.register('frequency')}
              disabled={!canManage || isSaving}
            >
              <option value="daily">{t('fixedCharges.frequencies.daily')}</option>
              <option value="weekly">{t('fixedCharges.frequencies.weekly')}</option>
              <option value="monthly">{t('fixedCharges.frequencies.monthly')}</option>
              <option value="yearly">{t('fixedCharges.frequencies.yearly')}</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label={t('fixedCharges.category')}
              {...form.register('category')}
              disabled={!canManage || isSaving}
            >
              <option value="">{t('forms.selectOption')}</option>
              <option value="rent">{t('fixedCharges.categories.rent')}</option>
              <option value="electricity">{t('fixedCharges.categories.electricity')}</option>
              <option value="water">{t('fixedCharges.categories.water')}</option>
              <option value="internet">{t('fixedCharges.categories.internet')}</option>
              <option value="insurance">{t('fixedCharges.categories.insurance')}</option>
              <option value="salary">{t('fixedCharges.categories.salary')}</option>
              <option value="other">{t('fixedCharges.categories.other')}</option>
            </Select>
            <Input
              label={t('fixedCharges.startDate')}
              type="date"
              {...form.register('start_date')}
              disabled={!canManage || isSaving}
            />
            <Input
              label={t('fixedCharges.endDate')}
              type="date"
              {...form.register('end_date')}
              disabled={!canManage || isSaving}
            />
          </div>
          <Button type="submit" variant="primary" block disabled={!canManage || isSaving}>
            {isSaving ? t('common.loading') : editing ? t('actions.save') : t('fixedCharges.add')}
          </Button>
        </form>
      </Card>

      <Card title={t('fixedCharges.title')}>
        <div className="space-y-3">
          {charges.data?.length === 0 && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
          {charges.data?.map((charge) => (
            <div
              key={charge.id}
              className={`glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                !charge.is_active ? 'opacity-50' : ''
              }`}
            >
              <div>
                <p className="font-semibold text-white">{charge.name}</p>
                <p className="text-xs text-gray-400">
                  {formatCurrency(charge.amount, 'THB', language)} / {frequencyLabels[charge.frequency]}
                </p>
                {charge.category && (
                  <p className="text-xs text-gray-400">{t(`fixedCharges.categories.${charge.category}`)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={charge.is_active ? 'success' : 'danger'}>
                  {charge.is_active ? 'Actif' : 'Inactif'}
                </Badge>
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => handleEdit(charge)} disabled={update.isPending}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(charge.id)} disabled={remove.isPending}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
