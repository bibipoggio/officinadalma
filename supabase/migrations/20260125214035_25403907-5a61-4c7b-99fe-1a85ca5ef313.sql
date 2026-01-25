-- Drop existing policies for course-images bucket
DROP POLICY IF EXISTS "Admins can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete course images" ON storage.objects;

-- Recreate policies allowing moderators AND admins to manage course images
CREATE POLICY "Moderators and admins can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images' 
  AND public.is_moderator_or_admin(auth.uid())
);

CREATE POLICY "Moderators and admins can update course images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images' 
  AND public.is_moderator_or_admin(auth.uid())
);

CREATE POLICY "Moderators and admins can delete course images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images' 
  AND public.is_moderator_or_admin(auth.uid())
);