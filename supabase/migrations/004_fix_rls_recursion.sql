-- Migration 004: Fix RLS recursion between restaurants and restaurant_members

-- Désactiver temporairement RLS pour corriger
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies sur ces tables
DROP POLICY IF EXISTS "Users can view their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can create restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and admins can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Only owners can delete restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can delete restaurants" ON public.restaurants;

DROP POLICY IF EXISTS "Users can view members of their restaurants" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners can update members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.restaurant_members;

-- Créer une fonction SECURITY DEFINER pour récupérer les restaurant_ids de l'user
-- Cette fonction bypasse RLS pour éviter la récursion
CREATE OR REPLACE FUNCTION public.get_user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.restaurants WHERE owner_id = auth.uid();
$$;

-- Nouvelles policies pour restaurants (utilisant la fonction)
CREATE POLICY "restaurants_select_policy"
  ON public.restaurants FOR SELECT
  USING (id IN (SELECT public.get_user_restaurant_ids()));

CREATE POLICY "restaurants_insert_policy"
  ON public.restaurants FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "restaurants_update_policy"
  ON public.restaurants FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "restaurants_delete_policy"
  ON public.restaurants FOR DELETE
  USING (owner_id = auth.uid());

-- Nouvelles policies pour restaurant_members
-- Utilise directement owner_id sur restaurants (pas de récursion car restaurants.SELECT utilise get_user_restaurant_ids)
CREATE POLICY "members_select_policy"
  ON public.restaurant_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "members_insert_policy"
  ON public.restaurant_members FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "members_update_policy"
  ON public.restaurant_members FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "members_delete_policy"
  ON public.restaurant_members FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Réactiver RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
