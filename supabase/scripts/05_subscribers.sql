-- ============================================================================
-- EARTHLY TRINKETS — Subscribers Table
-- ============================================================================
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

CREATE TABLE IF NOT EXISTS public.subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT
  WITH CHECK (true);

-- Only admins can read subscribers
CREATE POLICY "Admins can read subscribers"
  ON public.subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

-- Only admins can update subscribers (unsubscribe etc.)
CREATE POLICY "Admins can update subscribers"
  ON public.subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

-- Service role (edge functions) can read/update for sending emails and unsubscribe
-- (service_role bypasses RLS by default, so no policy needed)
