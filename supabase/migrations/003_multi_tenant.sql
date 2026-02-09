-- Migration 003: Multi-tenant support for multiple restaurants
-- This migration adds restaurant_id to all tables and updates RLS policies

-- 1. Create restaurants table
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  address text,
  phone text,
  email text,
  logo_url text,
  currency text not null default 'THB',
  timezone text not null default 'Asia/Bangkok',
  settings jsonb default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create restaurant_members junction table (for team access)
create table if not exists public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'manager', 'staff')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique(restaurant_id, user_id)
);

-- 3. Add restaurant_id to all existing tables
-- Products
alter table public.products
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Dishes
alter table public.dishes
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Suppliers
alter table public.suppliers
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Purchases
alter table public.purchases
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Sales
alter table public.sales
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Fixed charges
alter table public.fixed_charges
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Stock adjustments
alter table public.stock_adjustments
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

-- Profiles (add current_restaurant_id for quick access)
alter table public.profiles
  add column if not exists current_restaurant_id uuid references public.restaurants(id) on delete set null;

-- 4. Create indexes for performance
create index if not exists idx_products_restaurant on public.products(restaurant_id);
create index if not exists idx_dishes_restaurant on public.dishes(restaurant_id);
create index if not exists idx_suppliers_restaurant on public.suppliers(restaurant_id);
create index if not exists idx_purchases_restaurant on public.purchases(restaurant_id);
create index if not exists idx_sales_restaurant on public.sales(restaurant_id);
create index if not exists idx_fixed_charges_restaurant on public.fixed_charges(restaurant_id);
create index if not exists idx_stock_adjustments_restaurant on public.stock_adjustments(restaurant_id);
create index if not exists idx_restaurant_members_user on public.restaurant_members(user_id);
create index if not exists idx_restaurant_members_restaurant on public.restaurant_members(restaurant_id);

-- 5. Enable RLS on new tables
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;

-- 6. RLS Policies for restaurants table
-- Users can see restaurants they are members of
create policy "Users can view their restaurants"
  on public.restaurants for select
  using (
    id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

-- Only owners can insert new restaurants
create policy "Users can create restaurants"
  on public.restaurants for insert
  with check (owner_id = auth.uid());

-- Only owners and admins can update restaurants
create policy "Owners and admins can update restaurants"
  on public.restaurants for update
  using (
    owner_id = auth.uid()
    or id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Only owners can delete restaurants
create policy "Only owners can delete restaurants"
  on public.restaurants for delete
  using (owner_id = auth.uid());

-- 7. RLS Policies for restaurant_members table
create policy "Users can view members of their restaurants"
  on public.restaurant_members for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "Owners and admins can manage members"
  on public.restaurant_members for insert
  with check (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
    or restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can update members"
  on public.restaurant_members for update
  using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
    or restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can remove members"
  on public.restaurant_members for delete
  using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
    or restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- 8. Drop existing policies and recreate with restaurant filter
-- Products policies
drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

create policy "Users can read products of their restaurant"
  on public.products for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null -- for backward compatibility during migration
  );

create policy "Users can insert products for their restaurant"
  on public.products for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update products of their restaurant"
  on public.products for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete products"
  on public.products for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Dishes policies
drop policy if exists "Authenticated users can read dishes" on public.dishes;
drop policy if exists "Authenticated users can insert dishes" on public.dishes;
drop policy if exists "Authenticated users can update dishes" on public.dishes;
drop policy if exists "Authenticated users can delete dishes" on public.dishes;

create policy "Users can read dishes of their restaurant"
  on public.dishes for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert dishes for their restaurant"
  on public.dishes for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update dishes of their restaurant"
  on public.dishes for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete dishes"
  on public.dishes for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Suppliers policies
drop policy if exists "Authenticated users can read suppliers" on public.suppliers;
drop policy if exists "Authenticated users can insert suppliers" on public.suppliers;
drop policy if exists "Authenticated users can update suppliers" on public.suppliers;
drop policy if exists "Authenticated users can delete suppliers" on public.suppliers;

create policy "Users can read suppliers of their restaurant"
  on public.suppliers for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert suppliers for their restaurant"
  on public.suppliers for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update suppliers of their restaurant"
  on public.suppliers for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete suppliers"
  on public.suppliers for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Purchases policies
drop policy if exists "Authenticated users can read purchases" on public.purchases;
drop policy if exists "Authenticated users can insert purchases" on public.purchases;
drop policy if exists "Authenticated users can update purchases" on public.purchases;
drop policy if exists "Authenticated users can delete purchases" on public.purchases;

create policy "Users can read purchases of their restaurant"
  on public.purchases for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert purchases for their restaurant"
  on public.purchases for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update purchases of their restaurant"
  on public.purchases for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete purchases"
  on public.purchases for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Sales policies
drop policy if exists "Authenticated users can read sales" on public.sales;
drop policy if exists "Authenticated users can insert sales" on public.sales;
drop policy if exists "Authenticated users can update sales" on public.sales;
drop policy if exists "Authenticated users can delete sales" on public.sales;

create policy "Users can read sales of their restaurant"
  on public.sales for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert sales for their restaurant"
  on public.sales for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update sales of their restaurant"
  on public.sales for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete sales"
  on public.sales for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Fixed charges policies
drop policy if exists "Users can read fixed_charges" on public.fixed_charges;
drop policy if exists "Users can insert fixed_charges" on public.fixed_charges;
drop policy if exists "Users can update fixed_charges" on public.fixed_charges;
drop policy if exists "Users can delete fixed_charges" on public.fixed_charges;

create policy "Users can read fixed_charges of their restaurant"
  on public.fixed_charges for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert fixed_charges for their restaurant"
  on public.fixed_charges for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Users can update fixed_charges of their restaurant"
  on public.fixed_charges for update
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

create policy "Admins can delete fixed_charges"
  on public.fixed_charges for delete
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Stock adjustments policies
drop policy if exists "Authenticated users can read stock_adjustments" on public.stock_adjustments;
drop policy if exists "Authenticated users can insert stock_adjustments" on public.stock_adjustments;

create policy "Users can read stock_adjustments of their restaurant"
  on public.stock_adjustments for select
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
    or restaurant_id is null
  );

create policy "Users can insert stock_adjustments for their restaurant"
  on public.stock_adjustments for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.restaurant_members where user_id = auth.uid()
    )
  );

-- 9. Helper function to get current user's restaurant
create or replace function public.get_current_restaurant_id()
returns uuid
language sql
stable
security definer
as $$
  select current_restaurant_id from public.profiles where id = auth.uid();
$$;

-- 10. Function to create a new restaurant and add owner as member
create or replace function public.create_restaurant(
  p_name text,
  p_address text default null,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_restaurant_id uuid;
begin
  -- Create restaurant
  insert into public.restaurants (name, owner_id, address, phone, email)
  values (p_name, auth.uid(), p_address, p_phone, p_email)
  returning id into v_restaurant_id;

  -- Add owner as member
  insert into public.restaurant_members (restaurant_id, user_id, role)
  values (v_restaurant_id, auth.uid(), 'owner');

  -- Set as current restaurant
  update public.profiles set current_restaurant_id = v_restaurant_id where id = auth.uid();

  return v_restaurant_id;
end;
$$;

-- 11. Function to switch current restaurant
create or replace function public.switch_restaurant(p_restaurant_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Check if user is member of this restaurant
  if not exists (
    select 1 from public.restaurant_members
    where restaurant_id = p_restaurant_id and user_id = auth.uid()
  ) and not exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and owner_id = auth.uid()
  ) then
    raise exception 'Not a member of this restaurant';
  end if;

  -- Update current restaurant
  update public.profiles set current_restaurant_id = p_restaurant_id where id = auth.uid();

  return true;
end;
$$;

-- 12. Trigger to update updated_at
create or replace function public.update_restaurant_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_restaurants_updated_at on public.restaurants;
create trigger update_restaurants_updated_at
  before update on public.restaurants
  for each row execute function public.update_restaurant_updated_at();
