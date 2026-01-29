export type Role = 'admin' | 'manager' | 'staff';
export type Language = 'fr' | 'th' | 'en';

export interface Profile {
  id: string;
  full_name?: string;
  role: Role;
  language: Language;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  name_th?: string;
  name_en?: string;
  unit: string;
  category?: string;
  barcode?: string;
  reorder_level?: number;
  last_price?: number;
  photo_url?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Purchase {
  id: string;
  supplier_id?: string | null;
  purchase_date: string;
  total_amount: number;
  invoice_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface Dish {
  id: string;
  name: string;
  name_th?: string;
  name_en?: string;
  price: number;
  photo_url?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  cost?: number;
  margin?: number;
}

export interface DishIngredient {
  id: string;
  dish_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  dish_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  dish?: Dish;
}

export interface StockRow {
  product_id: string;
  current_quantity: number;
  reorder_level: number;
  needs_reorder: boolean;
  product?: Product;
}

export interface DailySummary {
  summary_date: string;
  revenue: number;
  purchase_cost: number;
  theoretical_cost: number;
  gross_margin_percent: number;
  total_sales: number;
}
