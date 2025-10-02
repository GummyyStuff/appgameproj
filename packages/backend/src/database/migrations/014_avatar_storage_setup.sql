-- Avatar Storage Setup SQL
-- Run this in your Supabase SQL editor to set up avatar storage

-- 1. Create the avatars storage bucket (private)
-- Note: This needs to be done via the Supabase Dashboard Storage section
-- Go to Storage > Create Bucket > Name: "avatars" > Public: No

-- 2. Create storage policies for the avatars bucket
-- Policy: Authenticated users can upload their own avatars
CREATE POLICY "Users can upload own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Authenticated users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Upload default avatar (this needs to be done via Storage interface)
-- Go to Storage > avatars bucket > Upload file
-- Upload the default-avatar.svg file to: defaults/default-avatar.svg
-- Content-Type: image/svg+xml

-- 4. Verify the setup
-- Check that the bucket exists and has the correct policies
SELECT 
  name as bucket_name,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'avatars';

-- Check storage policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%';

-- 5. Test the setup (optional)
-- This will show if the bucket is accessible
SELECT count(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'avatars';
