-- Create storage bucket for daily content media (meditations)
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-content', 'daily-content', true);

-- Allow admins/moderators to upload files
CREATE POLICY "Admins and moderators can upload daily content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'daily-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

-- Allow admins/moderators to update files
CREATE POLICY "Admins and moderators can update daily content"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'daily-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

-- Allow admins/moderators to delete files
CREATE POLICY "Admins and moderators can delete daily content"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'daily-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

-- Allow anyone to view/download files (public bucket)
CREATE POLICY "Anyone can view daily content"
ON storage.objects
FOR SELECT
USING (bucket_id = 'daily-content');