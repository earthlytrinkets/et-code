-- ─────────────────────────────────────────────────────────────────────────────
-- Script 01: Addresses
-- Run after: migration script (profiles, user_roles, triggers)
-- Purpose:   Stores user delivery addresses for the checkout flow
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.addresses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL DEFAULT 'Home',   -- Home | Work | Other
  full_name  TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  line1      TEXT        NOT NULL,
  line2      TEXT,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL,
  pincode    TEXT        NOT NULL,
  is_default BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own addresses
CREATE POLICY "Users can manage own addresses"
ON public.addresses FOR ALL
TO authenticated
USING  (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
