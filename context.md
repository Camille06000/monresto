# Monresto Context

## Purpose
Monresto is a mobile-first back-office web app for a street-food restaurant. It tracks purchases, sales, stock, dishes, products, and analytics. The UI is multilingual (FR/EN/TH) and uses Supabase for auth, database, and storage.

## Tech Stack
- Frontend: React 19 + Vite + TypeScript
- Styling: Tailwind CSS
- Data: Supabase (Postgres + RLS + Storage)
- State/data: React Query, Zustand
- i18n: i18next

## Key Pages
- Dashboard: KPIs and alerts
- Purchases: create purchases and items, upload invoices
- Sales: quick sale flow, cart, stock validation
- Stock: current stock from materialized view
- Dishes: create dishes, manage ingredients, upload photo
- Products: create products, CSV import, delete/archive
- Analytics: charts (Recharts)
- Settings: language and display config

## Data Model (Supabase)
Defined in `supabase/migrations/001_initial_schema.sql`.
- profiles: auth users + role
- suppliers
- products
- purchases, purchase_items
- dishes, dish_ingredients
- sales, sale_items
- stock_adjustments
- daily_summaries
- settings

Materialized Views:
- mv_dish_costs: dish cost from ingredients and last_price
- mv_current_stock: stock from purchases, sales, adjustments

Triggers/Functions:
- update_updated_at_column
- update_product_last_price
- calculate_purchase_total
- calculate_sale_total
- validate_sale_stock
- refresh_stock_cache
- refresh_dish_costs

RLS:
- roles: admin / manager / staff
- has_role() used across policies

## Storage Buckets
Created in migration:
- invoices (private)
- dishes (public)
- products (public)

Uploads use `src/lib/supabase.ts` -> `uploadToBucket()`.

## Frontend Changes Already Implemented
- Products CSV import (UI + parser): `src/pages/Products.tsx`, `src/lib/csv.ts`.
  - Import uses `upsert` with `onConflict: 'barcode'`.
  - Products list filters `is_active = true`.
- Deletion fallback to archive:
  - Products: `src/hooks/useProducts.ts`.
  - Dishes: `src/hooks/useDishes.ts`.
- Dish photo upload + preview:
  - `src/pages/Dishes.tsx` uses `uploadToBucket`.

## Environment
- Dev: `npm run dev`
- Build: `npm run build` -> `dist/`
- Env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Current Server Setup (as of Feb 5, 2026)
- Supabase local: `http://127.0.0.1:54321`
- Static front served by Nginx on port `3000`.
- Nginx root: `/var/www/monresto`
- Reverse proxy for Supabase paths:
  - /auth/v1, /rest/v1, /storage/v1, /graphql/v1, /functions/v1, /realtime/v1

## Deployment Notes
- Copy build output to `/var/www/monresto/`:
  - `rsync -a --delete /opt/monresto-app/dist/ /var/www/monresto/`
- Nginx config file:
  - `/etc/nginx/sites-available/monresto-3000`
  - symlink in `/etc/nginx/sites-enabled/`
- After changes: `nginx -t && systemctl reload nginx`

## Known Issues / Gotchas
- Service worker cache can serve stale bundles. Clear SW cache if old endpoints appear.
- Storage uploads require proper policies if buckets are private.

## Not Implemented (Planned)
- Multi-restaurant / multi-tenant model with invitations.
- Restaurant membership and per-restaurant roles.

EOF
