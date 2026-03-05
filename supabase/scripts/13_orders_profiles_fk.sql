-- Fix orders → profiles relationship for the admin dashboard.
-- PostgREST only discovers relationships via FK constraints in the public schema.
-- The original orders.user_id → auth.users is in the hidden auth schema,
-- so PostgREST can't find orders↔profiles and the join throws an error.
-- Re-pointing it to public.profiles (same values, since profiles.id = auth.users.id)
-- makes the relationship visible and the admin query works.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
