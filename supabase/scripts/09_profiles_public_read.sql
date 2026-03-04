-- ─────────────────────────────────────────────────────────────────────────────
-- Script 09: Allow public read of reviewer names + fix reviews→profiles join
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow anyone to read display fields from profiles (needed for reviews join).
DROP POLICY IF EXISTS "Public can read profile display info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON public.profiles;

CREATE POLICY "Public can read profile display info"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. Add a direct FK from reviews.user_id → profiles(id) so PostgREST can
--    resolve the embedded join `profiles(full_name)` in the reviews query.
--    (reviews already has user_id → auth.users(id); adding a second FK to
--     profiles is safe because profiles.id = auth.users.id for every row.)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_profile_fkey;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Allow anonymous (unauthenticated) users to call get_verified_buyers
--    so the verified-buyer badge works even on public product pages.
--    Wrapped in DO block in case 07_reviews.sql hasn't been run yet.
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_verified_buyers(UUID) TO anon, authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL; -- function not yet created; run 07_reviews.sql first
END $$;
