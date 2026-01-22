-- Allow users to enroll themselves in courses
-- Drop the restrictive policy
DROP POLICY IF EXISTS "No direct user inserts on enrollments" ON public.course_enrollments;

-- Create a new policy that allows users to enroll themselves in courses
-- They can only enroll in published courses that are either 'basic' type or 'premium' type (if they have subscription)
CREATE POLICY "Users can enroll themselves in courses"
ON public.course_enrollments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
    AND c.is_published = true
    AND (
      c.type = 'basic'
      OR c.type = 'premium'
      OR (c.type = 'aparte' AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = auth.uid()
        AND (s.current_period_end > now() OR s.trial_ends_at > now())
      ))
    )
  )
);