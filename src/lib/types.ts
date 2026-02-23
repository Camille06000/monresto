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
  category?: string;
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

export type PaymentMethod = 'cash' | 'stripe' | 'omise_promptpay' | 'sumup';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderType = 'dine_in' | 'delivery' | 'takeaway';
export type DeliveryStatus = 'pending_pickup' | 'in_transit' | 'delivered';

/** Payment settings stored in restaurant.settings JSONB */
export interface PaymentSettings {
  cash_enabled?: boolean;              // default true
  stripe_enabled?: boolean;
  stripe_publishable_key?: string;     // safe to store – public key only
  omise_enabled?: boolean;
  omise_public_key?: string;           // safe to store – public key only
  sumup_enabled?: boolean;
  payment_currency?: string;           // e.g. 'THB', 'EUR', 'USD'
}

export interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  status?: 'pending' | 'preparing' | 'ready' | 'delivered';
  table_number?: string | null;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  payment_provider_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: SaleItem[];
  // Delivery fields
  order_type?: OrderType;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_fee?: number;
  delivery_requested_time?: string | null;
  delivery_status?: DeliveryStatus | null;
  assigned_driver_id?: string | null;
  driver?: Profile;
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

export type ChargeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  frequency: ChargeFrequency;
  category?: string;
  start_date: string;
  end_date?: string | null;
  notes?: string;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyDishSale {
  restaurant_id?: string;
  sale_day: string;
  dish_id: string;
  dish_name: string;
  name_th?: string;
  name_en?: string;
  unit_price: number;
  total_quantity: number;
  total_revenue: number;
  unit_cost: number;
  total_cost: number;
  gross_margin: number;
}

export interface DailyProductConsumption {
  restaurant_id?: string;
  sale_day: string;
  product_id: string;
  product_name: string;
  name_th?: string;
  name_en?: string;
  unit: string;
  last_price: number;
  total_consumed: number;
  total_cost: number;
}

export interface DailySummaryEnhanced {
  restaurant_id?: string;
  sale_day: string;
  revenue: number;
  theoretical_cost: number;
  gross_margin: number;
  margin_percent: number;
  dishes_sold: number;
  total_items: number;
}

export type RestaurantRole = 'owner' | 'admin' | 'manager' | 'staff' | 'driver';

export interface Restaurant {
  id: string;
  name: string;
  slug?: string;
  owner_id: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  currency: string;
  timezone: string;
  settings?: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantRole;
  invited_by?: string;
  joined_at?: string;
  restaurant?: Restaurant;
}
