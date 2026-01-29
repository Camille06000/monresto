-- Seed data for MonResto MVP
do $$
declare
  v_purchase uuid;
begin
  -- Suppliers
  insert into public.suppliers (id, name, contact_name, phone, created_by) values
    (gen_random_uuid(), 'Market Soi 6', 'Somchai', '+66 12 345 6789', null),
    (gen_random_uuid(), 'Metro Cash', 'Dao', '+66 98 765 4321', null)
  on conflict do nothing;

  -- Products
  insert into public.products (id, name, name_th, name_en, unit, category, reorder_level, last_price, created_by) values
    (gen_random_uuid(), 'Poulet cuisse', 'ไก่คออบ', 'Chicken thigh', 'kg', 'meat', 5, 120, null),
    (gen_random_uuid(), 'Riz jasmin', 'ข้าวหอมมะลิ', 'Jasmine rice', 'kg', 'carb', 10, 35, null),
    (gen_random_uuid(), 'Nouilles riz', 'เส้นจันท์', 'Rice noodles', 'kg', 'carb', 8, 40, null),
    (gen_random_uuid(), 'Lait coco', 'กะทิ', 'Coconut milk', 'L', 'liquid', 5, 60, null),
    (gen_random_uuid(), 'Sauce poisson', 'น้ำปลา', 'Fish sauce', 'L', 'condiment', 1, 50, null),
    (gen_random_uuid(), 'Œuf', 'ไข่ไก่', 'Egg', 'pcs', 'protein', 30, 5, null)
  on conflict do nothing;

  -- Dishes
  insert into public.dishes (id, name, name_th, name_en, price, is_active, created_by) values
    (gen_random_uuid(), 'Pad Thai', 'ผัดไทย', 'Pad Thai', 60, true, null),
    (gen_random_uuid(), 'Som Tam', 'ส้มตำ', 'Papaya salad', 40, true, null),
    (gen_random_uuid(), 'Tom Yum', 'ต้มยำ', 'Tom Yum soup', 80, true, null)
  on conflict do nothing;

  -- Dish ingredients (Pad Thai)
  insert into public.dish_ingredients (id, dish_id, product_id, quantity)
  select gen_random_uuid(), d.id, p.id, q.qty
  from (values 
    ('Pad Thai','Nouilles riz', 0.10),
    ('Pad Thai','Poulet cuisse', 0.08),
    ('Pad Thai','Œuf', 1.0)
  ) as q(dish_name, product_name, qty)
  join public.dishes d on d.name = q.dish_name
  join public.products p on p.name = q.product_name
  on conflict do nothing;

  -- Dish ingredients (Som Tam)
  insert into public.dish_ingredients (id, dish_id, product_id, quantity)
  select gen_random_uuid(), d.id, p.id, q.qty
  from (values 
    ('Som Tam','Lait coco', 0.05),
    ('Som Tam','Sauce poisson', 0.02)
  ) as q(dish_name, product_name, qty)
  join public.dishes d on d.name = q.dish_name
  join public.products p on p.name = q.product_name
  on conflict do nothing;

  -- Dish ingredients (Tom Yum)
  insert into public.dish_ingredients (id, dish_id, product_id, quantity)
  select gen_random_uuid(), d.id, p.id, q.qty
  from (values 
    ('Tom Yum','Poulet cuisse', 0.10),
    ('Tom Yum','Lait coco', 0.10),
    ('Tom Yum','Sauce poisson', 0.03)
  ) as q(dish_name, product_name, qty)
  join public.dishes d on d.name = q.dish_name
  join public.products p on p.name = q.product_name
  on conflict do nothing;

  -- Example purchase to prime stock
  select gen_random_uuid() into v_purchase;
  insert into public.purchases (id, supplier_id, purchase_date, created_by)
  select v_purchase, s.id, current_date, null
  from public.suppliers s
  order by s.name
  limit 1;

  insert into public.purchase_items (purchase_id, product_id, quantity, unit_price)
  select v_purchase, p.id, q.qty, q.price
  from (values 
    ('Poulet cuisse', 10.0, 120),
    ('Riz jasmin', 20.0, 35),
    ('Nouilles riz', 15.0, 40),
    ('Lait coco', 10.0, 60),
    ('Sauce poisson', 5.0, 50),
    ('Œuf', 60.0, 5)
  ) as q(product_name, qty, price)
  join public.products p on p.name = q.product_name;

  refresh materialized view public.mv_current_stock;
  refresh materialized view public.mv_dish_costs;
end $$;
