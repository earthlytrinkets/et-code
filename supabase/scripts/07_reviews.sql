-- ─────────────────────────────────────────────────────────────────────────────
-- Script 07: Reviews
-- Purpose: Product reviews + ratings. One review per user per product.
--          Trigger auto-updates products.rating and products.review_count.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)          -- one review per user per product
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can read reviews"       ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own review"   ON public.reviews;
DROP POLICY IF EXISTS "Users can update own review"   ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own review"   ON public.reviews;

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

-- ── Trigger: keep products.rating + review_count in sync ──────────────────────

CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _product_id UUID;
BEGIN
  _product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET
    rating       = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) FROM public.reviews WHERE product_id = _product_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = _product_id)
  WHERE id = _product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_rating ON public.reviews;
CREATE TRIGGER trg_sync_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

-- ── RPC: get verified buyers for a product ────────────────────────────────────
-- Returns the user_ids of people who bought this product in a confirmed+ order.
-- SECURITY DEFINER so it can bypass order_items RLS (returns only UUIDs, no PII).

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
