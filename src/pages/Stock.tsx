import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStock } from '../hooks/useStock';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';

export function Stock() {
  const { t } = useTranslation();
  const { language } = useStore();
  const { stock, adjust } = useStock();
  const [form, setForm] = useState({ product_id: '', quantity: 0, adjustment_type: 'correction', reason: '' });

  const alerts = (stock.data ?? []).filter((s) => s.needs_reorder);
  const okItems = (stock.data ?? []).filter((s) => !s.needs_reorder);

  const submitAdjust = async () => {
    if (!form.product_id || !form.quantity) return;
    try {
      const qty = ['loss', 'waste'].includes(form.adjustment_type) ? -Math.abs(form.quantity) : form.quantity;
      await adjust.mutateAsync({ ...form, quantity: qty });
      toast.success(t('actions.adjustStock'));
      setForm({ product_id: '', quantity: 0, adjustment_type: 'correction', reason: '' });
    } catch (error: any) {
      toast.error(error.message ?? t('alerts.error'));
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{t('stock.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('stock.title')}</h1>
        </div>
      </div>

      <Card title={t('stock.alerts')}>
        <div className="space-y-3">
          {alerts.length === 0 && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
          {alerts.map((a) => (
            <div key={a.product_id} className="flex items-center justify-between glass rounded-xl p-3">
              <div>
                <p className="font-semibold text-white">{(a as any).product?.name}</p>
                <p className="text-xs text-gray-400">
                  {a.current_quantity.toFixed(2)} {(a as any).product?.unit} • {t('products.reorderLevel')}: {a.reorder_level}
                </p>
              </div>
              <Badge tone="danger">{t('stock.reorder')}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('stock.ok')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {okItems.map((a) => (
            <div key={a.product_id} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                <p className="font-semibold text-white">{(a as any).product?.name}</p>
                <p className="text-xs text-gray-400">
                  {a.current_quantity.toFixed(2)} {(a as any).product?.unit}
                </p>
              </div>
              <Badge tone="info">
                {formatCurrency(((a as any).product?.last_price ?? 0) * a.current_quantity, 'THB', language)}
              </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('actions.adjustStock')}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select
            label={t('products.title')}
            value={form.product_id}
            onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
          >
            <option value="">{t('forms.selectOption')}</option>
            {stock.data?.map((row: any) => (
              <option key={row.product_id} value={row.product_id} className="text-black">
                {row.product?.name}
              </option>
            ))}
          </Select>
          <Input
            label={t('stock.quantity')}
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
          <Select
            label={t('stock.type')}
            value={form.adjustment_type}
            onChange={(e) => setForm((f) => ({ ...f, adjustment_type: e.target.value }))}
          >
            <option value="loss">{t('stock.adjustType.loss')}</option>
            <option value="waste">{t('stock.adjustType.waste')}</option>
            <option value="correction">{t('stock.adjustType.correction')}</option>
            <option value="initial">{t('stock.adjustType.initial')}</option>
          </Select>
          <Input
            label={t('stock.reason')}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </div>
        <Button className="mt-3" onClick={submitAdjust} disabled={adjust.isPending || !form.product_id}>
          {t('actions.save')}
        </Button>
      </Card>
    </div>
  );
}
