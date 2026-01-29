import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { formatDate } from '../lib/utils';

export function Analytics() {
  const { t } = useTranslation();
  const { language } = useStore();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from('sales')
        .select('sale_date,total_amount')
        .gte('sale_date', since.toISOString())
        .order('sale_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData =
    data?.map((d) => ({
      date: formatDate(d.sale_date, language).slice(0, 6),
      revenue: d.total_amount,
    })) ?? [];

  return (
    <div className="space-y-4 pb-16">
      <div>
        <p className="text-sm text-gray-400">{t('nav.analytics')}</p>
        <h1 className="text-2xl font-bold text-white">{t('nav.analytics')}</h1>
      </div>

      <Card title={t('analyticsPage.revenue7d')}>
        {isLoading && <p className="text-gray-400 text-sm">{t('common.loading')}</p>}
        {!isLoading && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #1f2937' }} />
                <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title={t('analyticsPage.salesPerDay')}>
        {!isLoading && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
