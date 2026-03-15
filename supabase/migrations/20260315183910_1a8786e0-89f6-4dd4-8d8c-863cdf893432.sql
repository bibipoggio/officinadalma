
-- 1. Fix anonymous checkin user_id exposure
-- Restrict the checkins SELECT policy: anonymous rows visible only to owner
DROP POLICY IF EXISTS "Users can read checkins" ON public.checkins;
CREATE POLICY "Users can read checkins" ON public.checkins
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (user_id = auth.uid())
  OR (published = true AND share_mode = 'community'::share_mode)
);

-- Create a SECURITY DEFINER function for the community feed that strips user_id from anonymous entries
CREATE OR REPLACE FUNCTION public.get_community_checkins(p_min_date date)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  date date,
  energy integer,
  feeling_text text,
  share_mode text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.id,
    CASE WHEN c.share_mode = 'community'::share_mode THEN c.user_id ELSE NULL END AS user_id,
    c.date,
    c.energy,
    c.feeling_text,
    c.share_mode::text,
    c.created_at
  FROM checkins c
  WHERE c.published = true
    AND c.share_mode IN ('community'::share_mode, 'anonymous'::share_mode)
    AND c.date >= p_min_date
  ORDER BY c.date DESC, c.created_at DESC;
$$;

-- 2. Fix course_lessons basic access: change from public to authenticated
DROP POLICY IF EXISTS "Users can view lessons based on role" ON public.course_lessons;
CREATE POLICY "Users can view lessons based on role" ON public.course_lessons
AS PERMISSIVE FOR SELECT TO authenticated
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
    AND (
      access_level IN ('free', 'basic')
      OR (
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
