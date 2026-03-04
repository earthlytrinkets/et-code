-- ─────────────────────────────────────────────────────────────────────────────
-- Script 04: Extend Products Table
-- Run after: script 02 (products table must exist)
-- Purpose:   Add product detail fields needed for the detail page + admin panel
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN short_description   TEXT,
  ADD COLUMN materials           TEXT[]       NOT NULL DEFAULT '{}',
  ADD COLUMN care_instructions   TEXT[]       NOT NULL DEFAULT '{}',
  ADD COLUMN rating              NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN review_count        INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN is_new              BOOLEAN      NOT NULL DEFAULT false;

-- Add missing categories for this product range
INSERT INTO public.categories (name, slug) VALUES
  ('Pendants',     'pendants'),
  ('Paperweights', 'paperweights')
ON CONFLICT (slug) DO NOTHING;
