-- ─────────────────────────────────────────────────────────────────────────────
-- Script 05: Admin Setup
-- Run after: migration script (user_roles table must exist)
-- Purpose:   Grant admin role to a specific user
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Find your user UUID
-- Run this query first to get the UUID of the user you want to make admin:
--
--   SELECT id, email, created_at FROM auth.users ORDER BY created_at;
--
-- Copy the UUID from the result, then use it in Step 2.

-- Step 2: Grant admin role
-- Replace <your-user-uuid> with the UUID from Step 1.
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-uuid>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify it worked
-- SELECT u.email, r.role
-- FROM auth.users u
-- JOIN public.user_roles r ON r.user_id = u.id
-- WHERE r.role = 'admin';
