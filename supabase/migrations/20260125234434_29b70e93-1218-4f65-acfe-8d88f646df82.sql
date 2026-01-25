-- Add DELETE policies for storage buckets (skip course-images which already has policy)

-- Delete policy for daily-content bucket (used for audio/images)
CREATE POLICY "Moderators and admins can delete daily content files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

-- Create lesson-content bucket for videos, audios, and PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lesson-content', 'lesson-content', true, 3221225472)
ON CONFLICT (id) DO NOTHING;

-- Policies for lesson-content bucket
CREATE POLICY "Public can view lesson content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lesson-content');

CREATE POLICY "Moderators and admins can upload lesson content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

CREATE POLICY "Moderators and admins can update lesson content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-content' 
  AND public.is_moderator_or_admin(auth.uid())
);

CREATE POLICY "Moderators and admins can delete lesson content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-content' 
  AND public.is_moderator_or_admin(auth.uid())
);