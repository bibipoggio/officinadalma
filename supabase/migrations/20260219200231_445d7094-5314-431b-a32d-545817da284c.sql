
-- Add deleted_at column for soft delete on course_lessons
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Update SELECT policy to hide soft-deleted lessons from regular users
DROP POLICY IF EXISTS "Users can view lessons based on role" ON public.course_lessons;
CREATE POLICY "Users can view lessons based on role" 
ON public.course_lessons 
FOR SELECT 
USING (
  is_moderator_or_admin(auth.uid()) 
  OR (
    deleted_at IS NULL 
    AND is_published = true 
    AND EXISTS (
      SELECT 1 FROM course_modules m 
      JOIN courses c ON c.id = m.course_id 
      WHERE m.id = course_lessons.module_id 
      AND m.is_published = true 
      AND c.is_published = true
    )
  )
);
