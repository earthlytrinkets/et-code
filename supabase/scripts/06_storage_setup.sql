-- ─────────────────────────────────────────────────────────────────────────────
-- Script 06: Storage Bucket Setup
-- Run this in Supabase SQL Editor
-- Purpose: Create product-images bucket and set access policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Create the bucket (public = anyone can read via public URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,   -- 10 MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Step 2: Drop any old conflicting policies
DROP POLICY IF EXISTS "Public read access"       ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete" ON storage.objects;

-- Step 3: Allow anyone to read public images
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Step 4: Allow authenticated users (admins) to upload
CREATE POLICY "Authenticated can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Step 5: Allow authenticated users to update
CREATE POLICY "Authenticated can update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

-- Step 6: Allow authenticated users to delete
CREATE POLICY "Authenticated can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
