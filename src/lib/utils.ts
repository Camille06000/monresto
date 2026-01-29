import { format } from 'date-fns';
import { fr, enUS, th } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { DishIngredient, Product } from './types';

const localeMap: Record<string, Locale> = {
  fr,
  en: enUS,
  th,
};

export const formatDate = (date: string | number | Date, lang: string = 'fr') =>
  format(new Date(date), 'PPP', { locale: localeMap[lang] ?? fr });

export const formatCurrency = (value: number, currency = 'THB', lang: string = 'fr') =>
  new Intl.NumberFormat(lang, { style: 'currency', currency }).format(value);

export const calcDishCost = (ingredients: DishIngredient[], products: Product[]) =>
  ingredients.reduce((acc, ing) => {
    const product = products.find((p) => p.id === ing.product_id);
    const price = product?.last_price ?? 0;
    return acc + price * ing.quantity;
  }, 0);

export const calcMargin = (price: number, cost: number) => {
  if (price === 0) return 0;
  return Math.round(((price - cost) / price) * 100 * 10) / 10;
};
