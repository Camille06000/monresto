import { useTranslation } from 'react-i18next';
import { useDashboard } from '../hooks/useDashboard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useStore } from '../store/useStore';

export function Dashboard() {
  const { t } = useTranslation();
  const { dashboard } = useDashboard();
  const { language } = useStore();

  const summary = dashboard.data?.summary;
  const top = dashboard.data?.top ?? [];
  const alerts = dashboard.data?.alerts ?? [];

  if (dashboard.isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-primary mr-2" /> {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{t('dashboard.today')} • {formatDate(new Date(), language)}</p>
          <h1 className="text-2xl font-bold text-white">{t('nav.dashboard')}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title={t('dashboard.revenue')}>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(summary?.revenue ?? 0, 'THB', language)}
          </p>
        </Card>
        <Card title={t('dashboard.costs')}>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(summary?.purchase_cost ?? 0, 'THB', language)}
          </p>
        </Card>
        <Card title={t('dashboard.margin')}>
          <p className="text-3xl font-bold text-white">{(summary?.gross_margin_percent ?? 0).toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t('dashboard.topDishes')}>
          <div className="space-y-3">
            {top.length === 0 && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
            {top.map((dish) => (
              <div key={dish.dish_id} className="flex items-center justify-between p-3 glass rounded-xl">
                <div>
                  <p className="font-semibold text-white">{dish.name}</p>
                  <p className="text-xs text-gray-400">
                    {dish.quantity}× • {formatCurrency(dish.revenue ?? 0, 'THB', language)}
                  </p>
                </div>
                <Badge tone="success">{t('sales.total')}: {formatCurrency(dish.revenue ?? 0, 'THB', language)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t('dashboard.alerts')}>
          <div className="space-y-3">
            {alerts.length === 0 && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
            {alerts.map((a: any) => (
              <div key={a.product_id} className="flex items-center justify-between p-3 glass rounded-xl">
                <div>
                  <p className="font-semibold text-white">{a.product?.name}</p>
                  <p className="text-xs text-gray-400">
                    {a.current_quantity.toFixed(2)} {a.product?.unit} • {t('products.reorderLevel')}: {a.reorder_level}
                  </p>
                </div>
                <Badge tone="danger">{t('stock.reorder')}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
