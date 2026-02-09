import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { useStore } from '../store/useStore';
import { parseCsv } from '../lib/csv';
import type { Product } from '../lib/types';

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

type ImportReport = {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
};

const headerAliases: Record<string, string[]> = {
  name: ['name', 'nom', 'product', 'produit', 'name_fr', 'nom_fr'],
  name_th: ['name_th', 'nom_th', 'thai', 'th'],
  name_en: ['name_en', 'nom_en', 'english', 'en'],
  unit: ['unit', 'unite', 'uom'],
  category: ['category', 'categorie', 'cat'],
  reorder_level: ['reorder_level', 'reorder', 'reorderlevel', 'min_stock', 'min'],
  last_price: ['last_price', 'price', 'prix', 'cost'],
  barcode: ['barcode', 'ean', 'sku'],
  photo_url: ['photo_url', 'image', 'photo'],
  is_active: ['is_active', 'active'],
};

const pickValue = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
};

const parseNumberValue = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanValue = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
  if (['false', '0', 'no', 'non'].includes(normalized)) return false;
  return undefined;
};

export function Products() {
  const { t } = useTranslation();
  const { language, profile } = useStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const { products, upsert, bulkUpsert, remove } = useProducts(search.trim() ? search : undefined);
  const { register, handleSubmit, reset } = useForm<ProductForm>({
    defaultValues: { name: '', name_en: '', name_th: '', unit: 'kg', reorder_level: 0, last_price: 0 },
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'manager';

  const resetForm = () => {
    reset({ name: '', name_en: '', name_th: '', unit: 'kg', reorder_level: 0, last_price: 0 });
    setEditing(null);
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    reset({
      id: product.id,
      name: product.name,
      name_th: product.name_th ?? '',
      name_en: product.name_en ?? '',
      unit: product.unit,
      category: product.category ?? '',
      reorder_level: product.reorder_level ?? 0,
      last_price: product.last_price ?? 0,
    });
  };

  const onSubmit = async (values: ProductForm) => {
    try {
      if (editing) {
        await upsert.mutateAsync({ ...values, id: editing.id });
      } else {
        await upsert.mutateAsync(values);
      }
      toast.success(t('actions.save'));
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

  const handleDownloadTemplate = () => {
    const sample =
      'name,unit,category,reorder_level,last_price,barcode,name_th,name_en\n' +
      'Chicken thigh,kg,meat,5,120,,,\n' +
      'Jasmine rice,kg,carb,10,35,,,\n';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error(t('products.importNoFile'));
      return;
    }

    setImporting(true);
    setImportReport(null);
    try {
      const text = await importFile.text();
      const { rows } = parseCsv(text);
      if (!rows.length) {
        toast.error(t('products.importEmpty'));
        return;
      }

      const payloads: Array<Partial<Product>> = [];
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        const name = pickValue(row, headerAliases.name);
        const unit = pickValue(row, headerAliases.unit);
        if (!name || !unit) {
          errors.push(`${t('products.importRow')} ${idx + 2}: ${t('products.importMissingFields')}`);
          return;
        }
        const reorderRaw = pickValue(row, headerAliases.reorder_level);
        const lastPriceRaw = pickValue(row, headerAliases.last_price);
        const reorderLevel = parseNumberValue(reorderRaw);
        const lastPrice = parseNumberValue(lastPriceRaw);
        if (reorderRaw && reorderLevel === undefined) {
          errors.push(`${t('products.importRow')} ${idx + 2}: ${t('products.importInvalidNumber')}`);
          return;
        }
        if (lastPriceRaw && lastPrice === undefined) {
          errors.push(`${t('products.importRow')} ${idx + 2}: ${t('products.importInvalidNumber')}`);
          return;
        }

        const payload: Partial<Product> = {
          name,
          unit,
          category: pickValue(row, headerAliases.category),
          barcode: pickValue(row, headerAliases.barcode),
          name_th: pickValue(row, headerAliases.name_th),
          name_en: pickValue(row, headerAliases.name_en),
          photo_url: pickValue(row, headerAliases.photo_url),
          is_active: parseBooleanValue(pickValue(row, headerAliases.is_active)) ?? true,
        };
        if (reorderLevel !== undefined) payload.reorder_level = reorderLevel;
        if (lastPrice !== undefined) payload.last_price = lastPrice;
        payloads.push(payload);
      });

      if (!payloads.length) {
        setImportReport({ total: rows.length, imported: 0, skipped: rows.length, errors: errors.slice(0, 5) });
        toast.error(t('products.importNothing'));
        return;
      }

      await bulkUpsert.mutateAsync(payloads);
      setImportReport({
        total: rows.length,
        imported: payloads.length,
        skipped: rows.length - payloads.length,
        errors: errors.slice(0, 5),
      });
      toast.success(t('products.importDone'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    } finally {
      setImporting(false);
      setImportFile(null);
      setImportInputKey((prev) => prev + 1);
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

      {!canManage && (
        <div className="glass rounded-xl p-4 text-sm text-gray-200">{t('alerts.adminOnly')}</div>
      )}

      <Card title={t('products.importTitle')} actions={<Button variant="ghost" onClick={handleDownloadTemplate}>{t('products.importTemplate')}</Button>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-300">{t('products.importHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <label className="flex flex-col gap-1 text-sm text-gray-200 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">{t('products.importFile')}</span>
              <input
                key={importInputKey}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                  setImportReport(null);
                }}
                disabled={!canManage || importing || bulkUpsert.isPending}
              />
            </label>
            <Button
              type="button"
              variant="primary"
              onClick={handleImport}
              disabled={!canManage || importing || bulkUpsert.isPending}
            >
              {importing || bulkUpsert.isPending ? t('common.loading') : t('products.importButton')}
            </Button>
          </div>
          {importReport && (
            <div className="text-xs text-gray-300">
              {t('products.importReport', {
                total: importReport.total,
                imported: importReport.imported,
                skipped: importReport.skipped,
              })}
              {importReport.errors.length > 0 && (
                <div className="mt-2 text-gray-400">
                  {importReport.errors.map((err) => (
                    <div key={err}>{err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title={editing ? t('actions.edit') : t('products.add')}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {editing && (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={resetForm}>
                <X size={16} className="mr-1" /> {t('actions.cancel')}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="FR" {...register('name', { required: true })} disabled={!canManage || upsert.isPending} />
            <Input label="TH" {...register('name_th')} disabled={!canManage || upsert.isPending} />
            <Input label="EN" {...register('name_en')} disabled={!canManage || upsert.isPending} />
            <Input label={t('products.unit')} {...register('unit', { required: true })} disabled={!canManage || upsert.isPending} />
            <Input
              label={t('products.reorderLevel')}
              type="number"
              step="0.1"
              {...register('reorder_level', { valueAsNumber: true })}
              disabled={!canManage || upsert.isPending}
            />
            <Input
              label={t('products.lastPrice')}
              type="number"
              step="0.1"
              {...register('last_price', { valueAsNumber: true })}
              disabled={!canManage || upsert.isPending}
            />
            <Input label={t('products.category')} {...register('category')} disabled={!canManage || upsert.isPending} />
          </div>
          <Button type="submit" variant="primary" block disabled={!canManage || upsert.isPending}>
            {upsert.isPending ? t('common.loading') : editing ? t('actions.save') : t('products.add')}
          </Button>
        </form>
      </Card>

      <Card title={t('products.title')}>
        <div className="mb-3">
          <Input
            label={t('products.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.data?.map((p) => (
            <div key={p.id} className="glass rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-xs text-gray-400">
                  {p.unit} - {t('products.reorderLevel')}: {p.reorder_level ?? 0}
                </p>
                <p className="text-xs text-gray-400">
                  {t('products.lastPrice')}: {formatCurrency(p.last_price ?? 0, 'THB', language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">{p.category ?? '--'}</Badge>
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => handleEdit(p)} disabled={upsert.isPending}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(p.id)} disabled={remove.isPending}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!products.data?.length && <p className="text-gray-400 text-sm">{t('common.empty')}</p>}
        </div>
      </Card>
    </div>
  );
}
