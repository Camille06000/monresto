-- Supabase initial schema for MonResto (street food back-office)
-- Generated 2026-01-23
-- Covers tables, RLS, triggers, materialized views, seed buckets

-- =========================================
-- Extensions
-- =========================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================
-- Types
-- =========================================
do $$ begin
    if not exists (select 1 from pg_type where typname = 'role_enum') then
        create type role_enum as enum ('admin', 'manager', 'staff');
    end if;
end $$;

do $$ begin
    if not exists (select 1 from pg_type where typname = 'adjustment_enum') then
        create type adjustment_enum as enum ('loss', 'waste', 'correction', 'initial');
    end if;
end $$;

-- Helper functions (placed after profiles creation for dependency safety)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================
-- Tables
-- =========================================

-- 1) profiles (extension of auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role role_enum not null default 'staff',
  language text not null default 'fr',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

-- Functions that depend on profiles
create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = any(roles::role_enum[])
      and p.active = true
  );
$$;

create or replace function public.is_owner(owner uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = owner;
$$;

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, full_name, role, language)
  values (new.id, coalesce(new.email, 'user'), 'staff', 'fr')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute procedure public.update_updated_at_column();

-- 3) products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_th text,
  name_en text,
  unit text not null,
  category text,
  barcode text unique,
  reorder_level numeric(12,3) default 0,
  last_price numeric(12,2),
  photo_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_en,'') || ' ' || coalesce(name_th,'')));
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.update_updated_at_column();

-- 4) purchases
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_date date not null default current_date,
  total_amount numeric(14,2) default 0,
  invoice_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchases_supplier_idx on public.purchases(supplier_id);
create trigger purchases_updated_at
  before update on public.purchases
  for each row execute procedure public.update_updated_at_column();

-- 5) purchase_items
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(14,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);
create index if not exists purchase_items_purchase_idx on public.purchase_items(purchase_id);
create index if not exists purchase_items_product_idx on public.purchase_items(product_id);

-- 6) dishes
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_th text,
  name_en text,
  price numeric(12,2) not null,
  photo_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dishes_name_idx on public.dishes using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_en,'') || ' ' || coalesce(name_th,'')));
create trigger dishes_updated_at
  before update on public.dishes
  for each row execute procedure public.update_updated_at_column();

-- 7) dish_ingredients
create table if not exists public.dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create unique index if not exists dish_ingredient_unique on public.dish_ingredients(dish_id, product_id);

-- 8) sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date timestamptz not null default now(),
  total_amount numeric(14,2) default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_date_idx on public.sales(sale_date);
create trigger sales_updated_at
  before update on public.sales
  for each row execute procedure public.update_updated_at_column();

-- 9) sale_items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  dish_id uuid not null references public.dishes(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_price numeric(14,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists sale_items_dish_idx on public.sale_items(dish_id);

-- 10) stock_adjustments
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(12,3) not null,
  reason text,
  adjustment_type adjustment_enum not null default 'correction',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists stock_adjustments_product_idx on public.stock_adjustments(product_id);

-- 11) daily_summaries
create table if not exists public.daily_summaries (
  summary_date date primary key,
  revenue numeric(14,2) default 0,
  purchase_cost numeric(14,2) default 0,
  theoretical_cost numeric(14,2) default 0,
  gross_margin_percent numeric(6,2),
  total_sales integer default 0,
  created_at timestamptz not null default now()
);

-- 12) settings
create table if not exists public.settings (
  key text primary key,
  value text not null,
  description text
);

-- =========================================
-- Materialized Views
-- =========================================

-- View: dish costs (uses last_price)
create materialized view if not exists public.mv_dish_costs as
select
  d.id as dish_id,
  coalesce(sum(di.quantity * coalesce(p.last_price, 0)), 0)::numeric(14,2) as total_cost
from public.dishes d
left join public.dish_ingredients di on di.dish_id = d.id
left join public.products p on p.id = di.product_id
group by d.id
with data;
create unique index if not exists mv_dish_costs_pk on public.mv_dish_costs(dish_id);

create materialized view if not exists public.mv_current_stock as
with purchases as (
  select product_id, sum(quantity) as qty
  from public.purchase_items pi
  join public.purchases p on p.id = pi.purchase_id
  group by product_id
),
consumptions as (
  select di.product_id, sum(di.quantity * si.quantity)::numeric(14,3) as qty
  from public.sale_items si
  join public.dish_ingredients di on di.dish_id = si.dish_id
  group by di.product_id
),
adjusts as (
  select product_id, sum(quantity) as qty
  from public.stock_adjustments
  group by product_id
)
select
  pr.id as product_id,
  coalesce(pu.qty, 0) - coalesce(co.qty, 0) + coalesce(ad.qty, 0) as current_quantity,
  pr.reorder_level,
  (coalesce(pu.qty, 0) - coalesce(co.qty, 0) + coalesce(ad.qty, 0)) < coalesce(pr.reorder_level, 0) as needs_reorder
from public.products pr
left join purchases pu on pu.product_id = pr.id
left join consumptions co on co.product_id = pr.id
left join adjusts ad on ad.product_id = pr.id
with data;
create unique index if not exists mv_current_stock_pk on public.mv_current_stock(product_id);

-- =========================================
-- Functions & Triggers
-- =========================================

create or replace function public.update_product_last_price()
returns trigger as $$
begin
  update public.products set last_price = new.unit_price where id = new.product_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.calculate_purchase_total()
returns trigger as $$
begin
  update public.purchases p
    set total_amount = (
      select coalesce(sum(total_price), 0) from public.purchase_items where purchase_id = p.id
    )
  where p.id = coalesce(new.purchase_id, old.purchase_id);
  return new;
end;
$$ language plpgsql;

create or replace function public.calculate_sale_total()
returns trigger as $$
begin
  update public.sales s
    set total_amount = (
      select coalesce(sum(total_price), 0) from public.sale_items where sale_id = s.id
    )
  where s.id = coalesce(new.sale_id, old.sale_id);
  return new;
end;
$$ language plpgsql;

create or replace function public.validate_sale_stock()
returns trigger as $$
declare
  r record;
  missing numeric;
begin
  for r in
    select di.product_id,
           (di.quantity * new.quantity)::numeric(12,3) as required_qty,
           coalesce(ms.current_quantity, 0) as available_qty
    from public.dish_ingredients di
    left join public.mv_current_stock ms on ms.product_id = di.product_id
    where di.dish_id = new.dish_id
  loop
    if r.available_qty < r.required_qty then
      missing := r.required_qty - r.available_qty;
      raise exception 'INSUFFICIENT_STOCK for product % (missing %)', r.product_id, missing
        using errcode = 'P0001', detail = 'NEGATIVE_STOCK';
    end if;
  end loop;
  return new;
end;
$$ language plpgsql;

create or replace function public.refresh_stock_cache()
returns trigger as $$
begin
  refresh materialized view public.mv_current_stock;
  return null;
end;
$$ language plpgsql;

create or replace function public.refresh_dish_costs()
returns trigger as $$
begin
  refresh materialized view public.mv_dish_costs;
  return null;
end;
$$ language plpgsql;

-- Triggers
create trigger purchase_items_price_after
  after insert on public.purchase_items
  for each row execute procedure public.update_product_last_price();

create trigger purchase_items_total_after
  after insert or update or delete on public.purchase_items
  for each row execute procedure public.calculate_purchase_total();

create trigger sale_items_total_after
  after insert or update or delete on public.sale_items
  for each row execute procedure public.calculate_sale_total();

create trigger sale_items_validate_before
  before insert on public.sale_items
  for each row execute procedure public.validate_sale_stock();

-- Refresh MV triggers (manual to avoid heavy writes; keep hooks on key tables)
create trigger refresh_stock_after_purchase
  after insert or update or delete on public.purchase_items
  for each statement execute procedure public.refresh_stock_cache();

create trigger refresh_stock_after_adjustment
  after insert or update or delete on public.stock_adjustments
  for each statement execute procedure public.refresh_stock_cache();

create trigger refresh_stock_after_sale
  after insert or update or delete on public.sale_items
  for each statement execute procedure public.refresh_stock_cache();

create trigger refresh_dish_costs_after_price
  after insert or update or delete on public.dish_ingredients
  for each statement execute procedure public.refresh_dish_costs();

create trigger refresh_dish_costs_after_products
  after update of last_price on public.products
  for each statement execute procedure public.refresh_dish_costs();

-- =========================================
-- RLS Policies
-- =========================================

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.settings enable row level security;

-- profiles
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id or has_role(array['admin','manager']));
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin_manage on public.profiles
  for all using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));

-- suppliers
create policy suppliers_select_all on public.suppliers
  for select using (auth.uid() is not null);
create policy suppliers_write_admin on public.suppliers
  for insert with check (has_role(array['admin','manager']));
create policy suppliers_update_admin on public.suppliers
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy suppliers_delete_admin on public.suppliers
  for delete using (has_role(array['admin','manager']));

-- products
create policy products_select_all on public.products
  for select using (auth.uid() is not null);
create policy products_write_admin on public.products
  for insert with check (has_role(array['admin','manager']));
create policy products_update_admin on public.products
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy products_delete_admin on public.products
  for delete using (has_role(array['admin','manager']));

-- purchases
create policy purchases_select_owned on public.purchases
  for select using (auth.uid() = created_by or has_role(array['admin','manager']));
create policy purchases_insert_admin on public.purchases
  for insert with check (has_role(array['admin','manager']));
create policy purchases_update_admin on public.purchases
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy purchases_delete_admin on public.purchases
  for delete using (has_role(array['admin','manager']));

-- purchase_items
create policy purchase_items_select on public.purchase_items
  for select using (
    exists (select 1 from public.purchases p where p.id = purchase_items.purchase_id and (p.created_by = auth.uid() or has_role(array['admin','manager'])))
  );
create policy purchase_items_insert on public.purchase_items
  for insert with check (
    exists (select 1 from public.purchases p where p.id = purchase_items.purchase_id and has_role(array['admin','manager']))
  );
create policy purchase_items_update on public.purchase_items
  for update using (
    exists (select 1 from public.purchases p where p.id = purchase_items.purchase_id and has_role(array['admin','manager']))
  ) with check (
    exists (select 1 from public.purchases p where p.id = purchase_items.purchase_id and has_role(array['admin','manager']))
  );
create policy purchase_items_delete on public.purchase_items
  for delete using (
    exists (select 1 from public.purchases p where p.id = purchase_items.purchase_id and has_role(array['admin','manager']))
  );

-- dishes
create policy dishes_select_all on public.dishes
  for select using (auth.uid() is not null);
create policy dishes_write_admin on public.dishes
  for insert with check (has_role(array['admin','manager']));
create policy dishes_update_admin on public.dishes
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy dishes_delete_admin on public.dishes
  for delete using (has_role(array['admin','manager']));

-- dish_ingredients
create policy dish_ingredients_select on public.dish_ingredients
  for select using (auth.uid() is not null);
create policy dish_ingredients_write on public.dish_ingredients
  for insert with check (has_role(array['admin','manager']));
create policy dish_ingredients_update on public.dish_ingredients
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy dish_ingredients_delete on public.dish_ingredients
  for delete using (has_role(array['admin','manager']));

-- sales
create policy sales_select_owned on public.sales
  for select using (auth.uid() = created_by or has_role(array['admin','manager']));
create policy sales_insert_staff on public.sales
  for insert with check (has_role(array['admin','manager','staff']));
create policy sales_update_admin on public.sales
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy sales_delete_admin on public.sales
  for delete using (has_role(array['admin','manager']));

-- sale_items
create policy sale_items_select on public.sale_items
  for select using (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id and (s.created_by = auth.uid() or has_role(array['admin','manager'])))
  );
create policy sale_items_insert on public.sale_items
  for insert with check (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_role(array['admin','manager','staff']))
  );
create policy sale_items_update on public.sale_items
  for update using (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_role(array['admin','manager']))
  ) with check (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_role(array['admin','manager']))
  );
create policy sale_items_delete on public.sale_items
  for delete using (
    exists (select 1 from public.sales s where s.id = sale_items.sale_id and has_role(array['admin','manager']))
  );

-- stock_adjustments
create policy stock_adjustments_select on public.stock_adjustments
  for select using (auth.uid() is not null);
create policy stock_adjustments_insert on public.stock_adjustments
  for insert with check (has_role(array['admin','manager']));
create policy stock_adjustments_update on public.stock_adjustments
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy stock_adjustments_delete on public.stock_adjustments
  for delete using (has_role(array['admin','manager']));

-- daily_summaries
create policy daily_summaries_select on public.daily_summaries
  for select using (has_role(array['admin','manager']));
create policy daily_summaries_insert on public.daily_summaries
  for insert with check (has_role(array['admin','manager']));
create policy daily_summaries_update on public.daily_summaries
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy daily_summaries_delete on public.daily_summaries
  for delete using (has_role(array['admin','manager']));

-- settings
create policy settings_select on public.settings
  for select using (auth.uid() is not null);
create policy settings_write on public.settings
  for insert with check (has_role(array['admin','manager']));
create policy settings_update on public.settings
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy settings_delete on public.settings
  for delete using (has_role(array['admin','manager']));

-- =========================================
-- Storage buckets
-- =========================================
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('dishes', 'dishes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- =========================================
-- Seed minimal data (profiles require existing auth.users)
-- Insert settings defaults
insert into public.settings (key, value, description) values
  ('currency', '฿', 'Default currency symbol'),
  ('tax_rate', '0', 'VAT rate (%)'),
  ('restaurant_name', 'Mon Resto', 'Restaurant display name'),
  ('low_stock_alert_days', '3', 'Days forecast before alert')
on conflict (key) do nothing;

-- Refresh materialized views once
refresh materialized view public.mv_current_stock;
refresh materialized view public.mv_dish_costs;
