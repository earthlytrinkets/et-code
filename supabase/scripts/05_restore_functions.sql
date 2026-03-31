-- ─── Restore functions broken by codex agent ─────────────────────────────────
-- Run this in Supabase SQL Editor to restore get_verified_top_reviews,
-- handle_new_user (auto-subscribe), and fix subscribers table.

-- 1. Restore get_verified_top_reviews RPC
DROP FUNCTION IF EXISTS public.get_verified_top_reviews(INT);

CREATE OR REPLACE FUNCTION public.get_verified_top_reviews(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  rating INT,
  comment TEXT,
  created_at TIMESTAMPTZ,
  product_name TEXT,
  reviewer_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.rating::INT,
    r.comment::TEXT,
    r.created_at,
    p.name::TEXT AS product_name,
    pr.full_name::TEXT AS reviewer_name
  FROM reviews r
  JOIN products p ON p.id = r.product_id
  LEFT JOIN profiles pr ON pr.id = r.user_id
  WHERE r.rating = 5
    AND r.comment IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = r.product_id
        AND o.user_id = r.user_id
        AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
    )
  ORDER BY r.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_top_reviews(INT) TO anon, authenticated;


-- 2. Restore get_verified_buyers RPC
DROP FUNCTION IF EXISTS public.get_verified_buyers(UUID);

CREATE OR REPLACE FUNCTION public.get_verified_buyers(p_product_id UUID)
RETURNS TABLE(user_id UUID) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT o.user_id
  FROM   public.order_items oi
  JOIN   public.orders o ON o.id = oi.order_id
  WHERE  oi.product_id = p_product_id
    AND  o.user_id IS NOT NULL
    AND  o.status IN ('confirmed', 'processing', 'shipped', 'delivered');
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_buyers(UUID) TO anon, authenticated;


-- 3. Restore handle_new_user trigger (auto-creates profile + role + subscriber)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    INSERT INTO public.subscribers (email, status)
    VALUES (lower(trim(NEW.email)), 'active')
    ON CONFLICT (email) DO UPDATE
      SET status = 'active';
  END IF;

  RETURN NEW;
END;
$$;


-- 4. Ensure subscribers table has correct CHECK constraint and RLS policies
-- (Re-create policies idempotently)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read subscribers" ON public.subscribers;
CREATE POLICY "Admins can read subscribers"
  ON public.subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Admins can update subscribers" ON public.subscribers;
CREATE POLICY "Admins can update subscribers"
  ON public.subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.subscribers;
CREATE POLICY "Admins can delete subscribers"
  ON public.subscribers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );
