-- Migration: Fixed charges table and daily report view
-- Generated 2026-02-09

-- =========================================
-- Types
-- =========================================
do $$ begin
    if not exists (select 1 from pg_type where typname = 'charge_frequency_enum') then
        create type charge_frequency_enum as enum ('daily', 'weekly', 'monthly', 'yearly');
    end if;
end $$;

-- =========================================
-- Table: fixed_charges
-- =========================================
create table if not exists public.fixed_charges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  frequency charge_frequency_enum not null default 'monthly',
  category text,
  start_date date not null default current_date,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fixed_charges_updated_at
  before update on public.fixed_charges
  for each row execute procedure public.update_updated_at_column();

-- RLS for fixed_charges
alter table public.fixed_charges enable row level security;

create policy fixed_charges_select on public.fixed_charges
  for select using (auth.uid() is not null);
create policy fixed_charges_insert on public.fixed_charges
  for insert with check (has_role(array['admin','manager']));
create policy fixed_charges_update on public.fixed_charges
  for update using (has_role(array['admin','manager'])) with check (has_role(array['admin','manager']));
create policy fixed_charges_delete on public.fixed_charges
  for delete using (has_role(array['admin','manager']));

-- =========================================
-- View: daily dish sales report
-- =========================================
create or replace view public.v_daily_dish_sales as
select
  date_trunc('day', s.sale_date)::date as sale_day,
  si.dish_id,
  d.name as dish_name,
  d.name_th,
  d.name_en,
  d.price as unit_price,
  sum(si.quantity) as total_quantity,
  sum(si.total_price) as total_revenue,
  coalesce(mc.total_cost, 0) as unit_cost,
  sum(si.quantity) * coalesce(mc.total_cost, 0) as total_cost,
  sum(si.total_price) - (sum(si.quantity) * coalesce(mc.total_cost, 0)) as gross_margin
from public.sale_items si
join public.sales s on s.id = si.sale_id
join public.dishes d on d.id = si.dish_id
left join public.mv_dish_costs mc on mc.dish_id = d.id
group by date_trunc('day', s.sale_date)::date, si.dish_id, d.name, d.name_th, d.name_en, d.price, mc.total_cost
order by sale_day desc, total_quantity desc;

-- =========================================
-- View: daily product consumption
-- =========================================
create or replace view public.v_daily_product_consumption as
select
  date_trunc('day', s.sale_date)::date as sale_day,
  di.product_id,
  p.name as product_name,
  p.name_th,
  p.name_en,
  p.unit,
  p.last_price,
  sum(si.quantity * di.quantity) as total_consumed,
  sum(si.quantity * di.quantity * coalesce(p.last_price, 0)) as total_cost
from public.sale_items si
join public.sales s on s.id = si.sale_id
join public.dish_ingredients di on di.dish_id = si.dish_id
join public.products p on p.id = di.product_id
group by date_trunc('day', s.sale_date)::date, di.product_id, p.name, p.name_th, p.name_en, p.unit, p.last_price
order by sale_day desc, total_consumed desc;

-- =========================================
-- View: daily summary enhanced
-- =========================================
create or replace view public.v_daily_summary_enhanced as
select
  sale_day,
  sum(total_revenue) as revenue,
  sum(total_cost) as theoretical_cost,
  sum(gross_margin) as gross_margin,
  case when sum(total_revenue) > 0
    then round((sum(gross_margin) / sum(total_revenue)) * 100, 2)
    else 0
  end as margin_percent,
  count(distinct dish_id) as dishes_sold,
  sum(total_quantity) as total_items
from public.v_daily_dish_sales
group by sale_day
order by sale_day desc;

-- =========================================
-- Function: get monthly fixed charges total
-- =========================================
create or replace function public.get_monthly_fixed_charges()
returns numeric as $$
declare
  total numeric := 0;
begin
  select coalesce(sum(
    case frequency
      when 'daily' then amount * 30
      when 'weekly' then amount * 4.33
      when 'monthly' then amount
      when 'yearly' then amount / 12
    end
  ), 0)
  into total
  from public.fixed_charges
  where is_active = true
    and start_date <= current_date
    and (end_date is null or end_date >= current_date);

  return round(total, 2);
end;
$$ language plpgsql stable;

-- =========================================
-- RLS for views (grant access)
-- =========================================
grant select on public.v_daily_dish_sales to authenticated;
grant select on public.v_daily_product_consumption to authenticated;
grant select on public.v_daily_summary_enhanced to authenticated;
