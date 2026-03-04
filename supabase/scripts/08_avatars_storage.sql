-- ─────────────────────────────────────────────────────────────────────────────
-- Script 08: Avatars Storage Bucket
-- Purpose: Bucket for user profile pictures. Each user owns their own file.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read avatars"      ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar"  ON storage.objects;

-- Anyone can view avatars
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can only upload/update/delete their own file (path starts with their user_id)
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
