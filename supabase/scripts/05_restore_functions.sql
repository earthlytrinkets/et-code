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


-- 4. Restore validate_coupon_code (codex agent added 'out_for_delivery' which doesn't exist in enum)
DROP FUNCTION IF EXISTS public.validate_coupon_code(TEXT, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.validate_coupon_code(
  p_code TEXT,
  p_user_id UUID,
  p_subtotal NUMERIC
)
RETURNS TABLE (
  code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  min_order_value NUMERIC,
  max_discount_amount NUMERIC,
  discount_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_order_count INTEGER;
  v_coupon_uses_by_user INTEGER;
BEGIN
  SELECT *
  INTO v_coupon
  FROM public.coupons c
  WHERE upper(c.code) = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid coupon code.';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'This coupon is inactive.';
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RAISE EXCEPTION 'This coupon is not active yet.';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND now() >= v_coupon.expires_at THEN
    RAISE EXCEPTION 'This coupon has expired.';
  END IF;

  IF p_subtotal < v_coupon.min_order_value THEN
    RAISE EXCEPTION 'Minimum order of ₹% required.', trim(to_char(v_coupon.min_order_value, 'FM999999999.00'));
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'This coupon has reached its usage limit.';
  END IF;

  IF v_coupon.first_order_only THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'Please sign in to use this coupon.';
    END IF;

    SELECT count(*)
    INTO v_order_count
    FROM public.orders
    WHERE user_id = p_user_id
      AND status IN ('confirmed', 'processing', 'shipped', 'delivered');

    IF v_order_count > 0 THEN
      RAISE EXCEPTION 'This coupon is only available on your first order.';
    END IF;
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'Please sign in to use this coupon.';
    END IF;

    SELECT count(*)
    INTO v_coupon_uses_by_user
    FROM public.orders
    WHERE user_id = p_user_id
      AND coupon_code = v_coupon.code
      AND status IN ('confirmed', 'processing', 'shipped', 'delivered');

    IF v_coupon_uses_by_user >= v_coupon.max_uses_per_user THEN
      RAISE EXCEPTION 'You have already used this coupon the maximum number of times.';
    END IF;
  END IF;

  code := v_coupon.code;
  discount_type := v_coupon.discount_type;
  discount_value := v_coupon.discount_value;
  min_order_value := v_coupon.min_order_value;
  max_discount_amount := v_coupon.max_discount_amount;
  discount_amount := CASE
    WHEN v_coupon.discount_type = 'percentage' THEN
      LEAST(
        ROUND((p_subtotal * v_coupon.discount_value / 100.0)::numeric, 2),
        COALESCE(v_coupon.max_discount_amount, ROUND((p_subtotal * v_coupon.discount_value / 100.0)::numeric, 2))
      )
    ELSE
      LEAST(v_coupon.discount_value, p_subtotal)
  END;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon_code(TEXT, UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(TEXT, UUID, NUMERIC) TO authenticated;


-- 5. Ensure subscribers table has correct CHECK constraint and RLS policies
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
