import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { useDailyReport } from '../hooks/useDailyReport';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';

export function DailyReport() {
  const { t } = useTranslation();
  const { language } = useStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { dishSales, productConsumption, summary } = useDailyReport(date);

  const isLoading = dishSales.isLoading || productConsumption.isLoading || summary.isLoading;

  const exportCSV = () => {
    const dishes = dishSales.data ?? [];
    const products = productConsumption.data ?? [];

    let csv = 'RAPPORT JOURNALIER - ' + date + '\n\n';

    // Summary
    if (summary.data) {
      csv += 'RESUME\n';
      csv += `CA Total,${summary.data.revenue}\n`;
      csv += `Cout Theorique,${summary.data.theoretical_cost}\n`;
      csv += `Marge Brute,${summary.data.gross_margin}\n`;
      csv += `Marge %,${summary.data.margin_percent}%\n`;
      csv += `Plats vendus,${summary.data.dishes_sold}\n`;
      csv += `Total articles,${summary.data.total_items}\n\n`;
    }

    // Dish sales
    csv += 'VENTES PAR PLAT\n';
    csv += 'Plat,Quantite,CA,Cout,Marge\n';
    dishes.forEach((d) => {
      csv += `"${d.dish_name}",${d.total_quantity},${d.total_revenue},${d.total_cost},${d.gross_margin}\n`;
    });

    csv += '\nCONSOMMATION PRODUITS\n';
    csv += 'Produit,Unite,Quantite Utilisee,Cout\n';
    products.forEach((p) => {
      csv += `"${p.product_name}",${p.unit},${p.total_consumed},${p.total_cost}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-400">{t('dailyReport.title')}</p>
          <h1 className="text-2xl font-bold text-white">{t('dailyReport.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Button variant="secondary" onClick={exportCSV} disabled={isLoading}>
            <Download size={16} className="mr-1" /> {t('dailyReport.export')}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-primary mr-2" /> {t('common.loading')}
        </div>
      )}

      {!isLoading && summary.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title={t('dailyReport.revenue')}>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.data.revenue ?? 0, 'THB', language)}
            </p>
          </Card>
          <Card title={t('dailyReport.theoreticalCost')}>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.data.theoretical_cost ?? 0, 'THB', language)}
            </p>
          </Card>
          <Card title={t('dailyReport.margin')}>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.data.gross_margin ?? 0, 'THB', language)}
            </p>
          </Card>
          <Card title={t('dailyReport.margin') + ' %'}>
            <p className="text-2xl font-bold text-white">{summary.data.margin_percent ?? 0}%</p>
          </Card>
        </div>
      )}

      {!isLoading && !summary.data && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-gray-400">{t('dailyReport.noSales')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t('dailyReport.dishSales')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="pb-2">{t('dailyReport.dishName')}</th>
                  <th className="pb-2 text-right">{t('dailyReport.quantitySold')}</th>
                  <th className="pb-2 text-right">{t('dailyReport.revenue')}</th>
                  <th className="pb-2 text-right">{t('dailyReport.margin')}</th>
                </tr>
              </thead>
              <tbody>
                {dishSales.data?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      {t('common.empty')}
                    </td>
                  </tr>
                )}
                {dishSales.data?.map((dish) => (
                  <tr key={dish.dish_id} className="border-b border-white/5">
                    <td className="py-2 text-white">{dish.dish_name}</td>
                    <td className="py-2 text-right text-white">{dish.total_quantity}</td>
                    <td className="py-2 text-right text-white">
                      {formatCurrency(dish.total_revenue, 'THB', language)}
                    </td>
                    <td className="py-2 text-right">
                      <Badge tone={dish.gross_margin > 0 ? 'success' : 'danger'}>
                        {formatCurrency(dish.gross_margin, 'THB', language)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t('dailyReport.productConsumption')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="pb-2">{t('dailyReport.productName')}</th>
                  <th className="pb-2 text-right">{t('dailyReport.quantityUsed')}</th>
                  <th className="pb-2 text-right">{t('dailyReport.theoreticalCost')}</th>
                </tr>
              </thead>
              <tbody>
                {productConsumption.data?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      {t('common.empty')}
                    </td>
                  </tr>
                )}
                {productConsumption.data?.map((product) => (
                  <tr key={product.product_id} className="border-b border-white/5">
                    <td className="py-2 text-white">{product.product_name}</td>
                    <td className="py-2 text-right text-white">
                      {product.total_consumed.toFixed(2)} {product.unit}
                    </td>
                    <td className="py-2 text-right text-white">
                      {formatCurrency(product.total_cost, 'THB', language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
