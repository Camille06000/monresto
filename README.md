# MonResto – Back-office Street Food (MVP)

Application full-stack (React 18 + Supabase) pour la gestion d'un restaurant de rue : achats, plats, ventes, stock et dashboard multilingue (FR/TH/EN).

## Prérequis
- Node.js 18+
- Supabase CLI
- Compte Supabase (projet créé)

## Setup rapide
```bash
npm install
cp .env.example .env.local
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

### Base de données Supabase
```bash
supabase init
supabase db reset  # applique supabase/migrations/001_initial_schema.sql
supabase db seed --file supabase/seed.sql
```

Les buckets `invoices`, `dishes`, `products` sont créés dans la migration.

### Démarrer le front
```bash
npm run dev
```

## Structure
- `src/` React + TypeScript + Vite + Tailwind
  - `pages/` : Dashboard, Achats, Ventes, Stock, Plats, Produits, Analytics, Settings
  - `hooks/` : accès Supabase (auth, produits, achats, ventes, stock, dashboard)
  - `store/` : Zustand (profil, langue)
  - `i18n/` : ressources FR/TH/EN (i18next)
- `supabase/migrations/001_initial_schema.sql` : schéma + RLS + triggers + vues matérialisées
- `supabase/seed.sql` : données de test (produits, plats, achats)

## Règles clés
- Mobile-first (375px) avec bottom-nav
- RLS activé sur toutes les tables (rôles admin/manager/staff)
- Toutes les chaînes via i18next
- React Query pour data + optimisations (cache, invalidation)
- Zustand pour l'état global (auth/langue)
- Uploads factures/photos via Supabase Storage

## Scénario de validation MVP
1) Login avec un utilisateur Supabase existant (ajouter une entrée `profiles` pour le user).
2) Créer un achat avec 3 produits → stock augmente.
3) Créer un plat avec 3 ingrédients → coût calculé (vue `mv_dish_costs`).
4) Vendre 2 plats → stock diminue via trigger, CA augmente.
5) Dashboard affiche CA, marge et alertes stock.

## Déploiement
- Frontend : Vercel (VITE_* variables)
- Backend : Supabase (migrations + storage)

## Tests
- `npm run lint` pour ESLint
- `npm run typecheck` pour la vérification TypeScript
