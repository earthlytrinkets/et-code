-- ══════════════════════════════════════════════════════════════════════════════
-- Earthly Trinkets — Full Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- PREREQUISITES (created automatically by Supabase on project creation):
--   • auth.users              — Supabase built-in auth table
--   • public.profiles         — created by the default Lovable migration
--   • public.user_roles       — created by the default Lovable migration
--   • public.app_role enum    — 'admin' | 'user'
--   • public.has_role()       — checks if a user has a given role
--   • public.update_updated_at_column() — sets updated_at = now() on UPDATE
--   • public.handle_new_user() trigger  — auto-creates a profiles row on signup
--
-- Run order: this single file is self-contained. Execute it once.
-- After this: run 02_storage.sql, then 03_admin_setup.sql.
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
  compare_at_price  NUMERIC(10,2),              -- original / strikethrough price
  category_id       UUID          REFERENCES public.categories(id),
  images            TEXT[]        NOT NULL DEFAULT '{}',
  tags              TEXT[]        NOT NULL DEFAULT '{}',
  materials         TEXT[]        NOT NULL DEFAULT '{}',
  care_instructions TEXT[]        NOT NULL DEFAULT '{}',
  stock             INTEGER       NOT NULL DEFAULT 0,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  is_featured       BOOLEAN       NOT NULL DEFAULT false,
  is_new            BOOLEAN       NOT NULL DEFAULT false,
  is_coming_soon    BOOLEAN       NOT NULL DEFAULT false,  -- greyed out, not purchasable
  rating            NUMERIC(3,2)  NOT NULL DEFAULT 0,      -- auto-maintained by reviews trigger
  review_count      INTEGER       NOT NULL DEFAULT 0,      -- auto-maintained by reviews trigger
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone (including logged-out visitors) can browse active products
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Admins can create, update, and delete products
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at on every row change
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomically decrement stock after an order is confirmed.
-- Returns TRUE if stock was sufficient; FALSE if not (prevents overselling).
-- Uses FOR UPDATE row-lock so concurrent orders cannot both succeed on the last unit.
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


-- ─── Addresses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.addresses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL DEFAULT 'Home',  -- Home | Work | Other
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

CREATE TYPE public.order_status AS ENUM (
  'pending',          -- payment initiated but not confirmed
  'confirmed',        -- payment verified / COD placed
  'processing',       -- being packed
  'shipped',          -- handed to courier, AWB assigned
  'out_for_delivery', -- last-mile delivery
  'delivered',        -- delivered to customer
  'cancelled',
  'refunded'
);

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
  shipping_address    JSONB         NOT NULL,   -- full address snapshot at order time
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

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Order Items ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,   -- snapshot at time of order
  product_image TEXT,                     -- snapshot — first image URL
  price         NUMERIC(10,2) NOT NULL,   -- snapshot — price at time of purchase
  quantity      INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ─── Reviews ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)  -- one review per user per product
);

-- FK to profiles so PostgREST can resolve the reviews→profiles join for author names
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_profile_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Users can insert own review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own review"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: keep products.rating + review_count in sync automatically
CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _product_id UUID;
BEGIN
  _product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
     SET rating       = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)
                           FROM public.reviews WHERE product_id = _product_id),
         review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = _product_id)
   WHERE id = _product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_rating ON public.reviews;
CREATE TRIGGER trg_sync_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

-- RPC: get verified buyers (purchased this product in a confirmed+ order)
-- SECURITY DEFINER so it bypasses order_items RLS — returns only UUIDs, no PII
CREATE OR REPLACE FUNCTION public.get_verified_buyers(p_product_id UUID)
RETURNS TABLE(user_id UUID) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT o.user_id
  FROM   public.order_items oi
  JOIN   public.orders o ON o.id = oi.order_id
  WHERE  oi.product_id = p_product_id
    AND  o.user_id IS NOT NULL
    AND  o.status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered');
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_buyers(UUID) TO anon, authenticated;


-- ─── Custom Orders ────────────────────────────────────────────────────────────
-- Stores free-form customer enquiries submitted via the Custom Orders page

CREATE TABLE IF NOT EXISTS public.custom_orders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  budget_range TEXT,
  status       TEXT        NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'reviewed', 'contacted', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit custom orders"
  ON public.custom_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read custom orders"
  ON public.custom_orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom orders"
  ON public.custom_orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ─── Coupons ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT          UNIQUE NOT NULL,
  discount_type   TEXT          NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,           -- NULL = unlimited
  uses_count      INTEGER       NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,       -- NULL = never expires
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Sample coupons — remove or adjust before going live
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_uses)
VALUES
  ('WELCOME10', 'percentage', 10,  0,    NULL),
  ('FLAT100',   'flat',       100, 500,  NULL),
  ('FIRST50',   'percentage', 50,  1000, 100)
ON CONFLICT (code) DO NOTHING;
