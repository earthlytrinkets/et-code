-- ─────────────────────────────────────────────────────────────────────────────
-- Script 02: Categories & Products
-- Run after: migration script (profiles, user_roles, triggers)
-- Purpose:   Product catalogue — fetched by Shop, ProductDetail, Home pages
-- ─────────────────────────────────────────────────────────────────────────────

-- Categories
CREATE TABLE public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed categories matching the current hardcoded products
INSERT INTO public.categories (name, slug) VALUES
  ('Rings',      'rings'),
  ('Earrings',   'earrings'),
  ('Necklaces',  'necklaces'),
  ('Bracelets',  'bracelets'),
  ('Home Decor', 'home-decor'),
  ('Keychains',  'keychains');

-- Products
CREATE TABLE public.products (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT          NOT NULL,
  slug             TEXT          NOT NULL UNIQUE,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),              -- original / strikethrough price
  category_id      UUID          REFERENCES public.categories(id),
  images           TEXT[]        NOT NULL DEFAULT '{}',  -- Supabase Storage public URLs
  tags             TEXT[]        NOT NULL DEFAULT '{}',
  stock            INTEGER       NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  is_featured      BOOLEAN       NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone (including logged-out visitors) can browse active products
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

-- Admins can create, update, and delete products
CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at on every row change
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
