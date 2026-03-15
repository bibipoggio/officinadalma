
-- Fix: Premium lesson content accessible without subscription or enrollment
-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Users can view lessons based on role" ON public.course_lessons;

-- Create a new SELECT policy that enforces access_level
CREATE POLICY "Users can view lessons based on role" ON public.course_lessons
FOR SELECT
TO public
USING (
  -- Admins/moderators see everything
  is_moderator_or_admin(auth.uid())
  OR (
    -- Basic visibility: published lesson in published module/course
    deleted_at IS NULL
    AND is_published = true
    AND EXISTS (
      SELECT 1
      FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = course_lessons.module_id
        AND m.is_published = true
        AND c.is_published = true
    )
    AND (
      -- Free/basic lessons: visible to all authenticated
      access_level IN ('free', 'basic')
      OR (
        -- Premium lessons: require active subscription OR enrollment
        access_level = 'premium'
        AND auth.uid() IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.user_id = auth.uid()
              AND (s.current_period_end > now() OR s.trial_ends_at > now())
          )
          OR EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.user_id = auth.uid()
              AND ce.course_id = course_lessons.course_id
          )
        )
      )
    )
  )
);
