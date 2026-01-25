-- Create storage bucket for course images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read course images (public bucket)
CREATE POLICY "Anyone can view course images"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Allow admins to upload course images
CREATE POLICY "Admins can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images' 
  AND public.is_admin(auth.uid())
);

-- Allow admins to update course images
CREATE POLICY "Admins can update course images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images' 
  AND public.is_admin(auth.uid())
);

-- Allow admins to delete course images
CREATE POLICY "Admins can delete course images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images' 
  AND public.is_admin(auth.uid())
);