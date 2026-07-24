-- ============================================================
-- SQL Migration: Admin Permissions & RLS Policies Overhaul
-- ============================================================

-- 1. Table Grants for authenticated users (required for client-side queries)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 2. Drop any restrictive select/update policies to replace them
DROP POLICY IF EXISTS "wallets_self_select" ON public.wallets;
DROP POLICY IF EXISTS "tx_self_select" ON public.transactions;
DROP POLICY IF EXISTS "dep_self_select" ON public.deposit_requests;
DROP POLICY IF EXISTS "roles_self_select" ON public.user_roles;

-- 3. Wallets Policies
CREATE POLICY "wallets_select_policy" ON public.wallets 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wallets_update_policy" ON public.wallets 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wallets_insert_policy" ON public.wallets 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Transactions Policies
CREATE POLICY "tx_select_policy" ON public.transactions 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tx_insert_policy" ON public.transactions 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tx_update_policy" ON public.transactions 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 5. Deposit Requests Policies
CREATE POLICY "dep_select_policy" ON public.deposit_requests 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dep_update_policy" ON public.deposit_requests 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. User Roles Policies
CREATE POLICY "roles_select_policy" ON public.user_roles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_insert_policy" ON public.user_roles 
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_update_policy" ON public.user_roles 
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Ensure profiles has complete selector/updater controls
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_policy" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
