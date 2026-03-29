-- Generated from supabase/scripts/01_schema.sql

-- ══════════════════════════════════════════════════════════════════════════════
-- Earthly Trinkets — Full Database Schema
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── Profiles: allow public read for review author names ─────────────────────

DROP POLICY IF EXISTS "Public can read profile display info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON public.profiles;

CREATE POLICY "Public can read profile display info"
  ON public.profiles FOR SELECT
  USING (true);


-- ─── Categories ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.categories (name, slug) VALUES
  ('Rings',        'rings'),
  ('Earrings',     'earrings'),
  ('Necklaces',    'necklaces'),
  ('Bracelets',    'bracelets'),
  ('Pendants',     'pendants'),
  ('Paperweights', 'paperweights'),
  ('Home Decor',   'home-decor'),
  ('Keychains',    'keychains')
ON CONFLICT (slug) DO NOTHING;


-- ─── Products ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT          NOT NULL,
  slug              TEXT          NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL,
  compare_at_price  NUMERIC(10,2),
  category_id       UUID          REFERENCES public.categories(id),
  images            TEXT[]        NOT NULL DEFAULT '{}',
  tags              TEXT[]        NOT NULL DEFAULT '{}',
  materials         TEXT[]        NOT NULL DEFAULT '{}',
  care_instructions TEXT[]        NOT NULL DEFAULT '{}',
  stock             INTEGER       NOT NULL DEFAULT 0,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  is_featured       BOOLEAN       NOT NULL DEFAULT false,
  is_new            BOOLEAN       NOT NULL DEFAULT false,
  is_coming_soon    BOOLEAN       NOT NULL DEFAULT false,
  display_order     INTEGER       NOT NULL DEFAULT 0,
  rating            NUMERIC(3,2)  NOT NULL DEFAULT 0,
  review_count      INTEGER       NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id uuid,
  p_quantity   integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_stock integer;
BEGIN
  SELECT stock INTO cur_stock
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF cur_stock IS NULL OR cur_stock < p_quantity THEN
    RETURN false;
  END IF;

  UPDATE public.products
     SET stock = stock - p_quantity
   WHERE id = p_product_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id uuid,
  p_quantity   integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
     SET stock = stock + p_quantity
   WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO service_role;


-- ─── Addresses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.addresses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL DEFAULT 'Home',
  full_name  TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  line1      TEXT        NOT NULL,
  line2      TEXT,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL,
  pincode    TEXT        NOT NULL,
  country    TEXT        NOT NULL DEFAULT 'India',
  is_default BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
  ON public.addresses FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Orders ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'refunded'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  status              order_status  NOT NULL DEFAULT 'pending',
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code         TEXT,
  shipping_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  payment_method      TEXT          NOT NULL DEFAULT 'cod'
                        CHECK (payment_method IN ('razorpay', 'cod')),
  shipping_address    JSONB         NOT NULL,
  shipping_method     TEXT          CHECK (shipping_method IN ('personal', 'shiprocket')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  shiprocket_order_id TEXT,
  shiprocket_awb      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Order Items ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,
  product_image TEXT,
  price         NUMERIC(10,2) NOT NULL,
  quantity      INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ─── Reviews ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE public.products
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE product_id = v_product_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = v_product_id)
  WHERE id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_product_rating_after_insert ON public.reviews;
DROP TRIGGER IF EXISTS sync_product_rating_after_update ON public.reviews;
DROP TRIGGER IF EXISTS sync_product_rating_after_delete ON public.reviews;

CREATE TRIGGER sync_product_rating_after_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

CREATE TRIGGER sync_product_rating_after_update
  AFTER UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

CREATE TRIGGER sync_product_rating_after_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

CREATE OR REPLACE FUNCTION public.get_verified_buyers(p_product_id UUID)
RETURNS TABLE (user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.user_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.user_id IS NOT NULL
    AND o.status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered');
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_buyers(UUID) TO authenticated;


-- ─── Custom Orders ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_orders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  budget_range TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create custom orders"
  ON public.custom_orders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read custom orders"
  ON public.custom_orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom orders"
  ON public.custom_orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_custom_orders_updated_at ON public.custom_orders;
CREATE TRIGGER update_custom_orders_updated_at
  BEFORE UPDATE ON public.custom_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Coupons ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT          UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT          NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (
                    discount_value > 0
                    AND (discount_type <> 'percentage' OR discount_value <= 100)
                  ),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  max_uses_per_user INTEGER CHECK (max_uses_per_user IS NULL OR max_uses_per_user > 0),
  uses_count      INTEGER       NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  first_order_only BOOLEAN      NOT NULL DEFAULT false,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  max_discount_amount NUMERIC(10,2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

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
  FROM public.coupons
  WHERE upper(code) = upper(trim(p_code));

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
      AND status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered');

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
      AND status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered');

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

CREATE OR REPLACE FUNCTION public.adjust_coupon_usage(
  p_code TEXT,
  p_delta INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_delta = 0 THEN
    RETURN true;
  END IF;

  IF p_delta > 0 THEN
    UPDATE public.coupons
    SET uses_count = uses_count + p_delta
    WHERE upper(code) = upper(trim(p_code))
      AND (
        max_uses IS NULL
        OR uses_count + p_delta <= max_uses
      );
  ELSE
    UPDATE public.coupons
    SET uses_count = GREATEST(uses_count + p_delta, 0)
    WHERE upper(code) = upper(trim(p_code));
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, max_uses, first_order_only, max_uses_per_user, max_discount_amount)
VALUES
  ('WELCOME10', 'Welcome discount for new customers', 'percentage', 10,  0,    NULL, false, 1, NULL),
  ('FLAT100',   'Flat discount on larger orders',     'flat',       100, 500,  NULL, false, NULL, NULL),
  ('FIRST50',   'First order offer with a discount cap', 'percentage', 50, 1000, 100, true, 1, 500)
ON CONFLICT (code) DO NOTHING;


-- ─── Subscribers ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscribers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  status     TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read subscribers"
  ON public.subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

CREATE POLICY "Admins can update subscribers"
  ON public.subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

CREATE POLICY "Admins can delete subscribers"
  ON public.subscribers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );
