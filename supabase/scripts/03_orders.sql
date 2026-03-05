-- ─────────────────────────────────────────────────────────────────────────────
-- Script 03: Orders & Order Items
-- Run after: script 02 (products must exist before order_items can reference them)
-- Purpose:   Stores Razorpay payment info, Shiprocket tracking, and line items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE public.order_status AS ENUM (
  'pending',    -- payment initiated but not confirmed
  'confirmed',  -- payment verified
  'processing', -- being packed
  'shipped',    -- handed to courier, AWB assigned
  'delivered',  -- delivered to customer
  'cancelled',
  'refunded'
);

CREATE TABLE public.orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  status              order_status  NOT NULL DEFAULT 'pending',
  subtotal            NUMERIC(10,2) NOT NULL,
  shipping_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  shipping_address    JSONB         NOT NULL,   -- full address snapshot at order time
  razorpay_order_id   TEXT,                     -- set when Razorpay order is created
  razorpay_payment_id TEXT,                     -- set after payment success
  shiprocket_order_id TEXT,                     -- set after Shiprocket order is created
  shiprocket_awb      TEXT,                     -- airway bill / tracking number
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,   -- snapshot — product name may change later
  product_image TEXT,                     -- snapshot — first image URL at time of order
  price         NUMERIC(10,2) NOT NULL,   -- snapshot — price at time of purchase
  quantity      INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders RLS
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

-- Order items RLS
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

-- Auto-update updated_at on every order change
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
