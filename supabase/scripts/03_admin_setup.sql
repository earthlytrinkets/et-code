-- ══════════════════════════════════════════════════════════════════════════════
-- Earthly Trinkets — Grant Admin Role
-- Run after 01_schema.sql and 02_storage.sql
-- Run this ONCE per admin user you want to add.
-- ══════════════════════════════════════════════════════════════════════════════

-- Step 1: Find the UUID of the user you want to make admin
--
--   SELECT id, email, created_at FROM auth.users ORDER BY created_at;
--
-- Copy the UUID from the result, then paste it below.

-- Step 2: Replace <your-user-uuid> with the UUID from Step 1, then run.
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-uuid>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify it worked
-- SELECT u.email, r.role
-- FROM auth.users u
-- JOIN public.user_roles r ON r.user_id = u.id
-- WHERE r.role = 'admin';
