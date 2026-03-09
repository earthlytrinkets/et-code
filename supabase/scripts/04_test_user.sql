-- ══════════════════════════════════════════════════════════════════════════════
-- Earthly Trinkets — Test User Setup
-- Run in: Supabase Dashboard → SQL Editor
--
-- Creates a test customer account you can log in with immediately.
-- The handle_new_user() trigger auto-creates the profile + assigns 'user' role.
--
-- Login credentials:
--   Email   : test@earthlytrinkets.in
--   Password : Test@1234
-- ══════════════════════════════════════════════════════════════════════════════

-- Uses pgcrypto's crypt() to generate a real bcrypt hash at runtime,
-- so the password is guaranteed to match — no copy-paste hash issues.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@earthlytrinkets.in',
  crypt('Test@1234', gen_salt('bf', 10)),  -- bcrypt hash generated at runtime
  now(),
  '{"full_name": "Test Customer"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '', '', '', ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'test@earthlytrinkets.in'
);  -- safe to re-run


-- ── Verify ────────────────────────────────────────────────────────────────────
-- Run this to confirm the user + profile + role were created:
--
-- SELECT u.email, p.full_name, r.role
-- FROM   auth.users u
-- JOIN   public.profiles  p ON p.id = u.id
-- JOIN   public.user_roles r ON r.user_id = u.id
-- WHERE  u.email = 'test@earthlytrinkets.in';
