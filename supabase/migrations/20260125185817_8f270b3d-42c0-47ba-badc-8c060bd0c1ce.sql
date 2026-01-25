-- Drop existing policy and create new one that allows admins to see unpublished lessons
DROP POLICY IF EXISTS "Users can view published lessons" ON public.course_lessons;

CREATE POLICY "Users can view lessons based on role" 
ON public.course_lessons 
FOR SELECT 
USING (
  -- Moderators and admins can see all lessons
  is_moderator_or_admin(auth.uid())
  OR
  -- Regular users can only see published lessons from published modules/courses
  (
    (is_published = true) 
    AND (EXISTS ( 
      SELECT 1
      FROM (course_modules m
        JOIN courses c ON ((c.id = m.course_id)))
      WHERE ((m.id = course_lessons.module_id) AND (m.is_published = true) AND (c.is_published = true))
    ))
  )
);