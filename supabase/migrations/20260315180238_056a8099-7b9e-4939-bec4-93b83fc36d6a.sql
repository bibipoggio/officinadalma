
DROP FUNCTION IF EXISTS public.get_users_list();

CREATE OR REPLACE FUNCTION public.get_users_list()
RETURNS TABLE(id uuid, display_name text, created_at timestamp with time zone, last_active date, total_checkins bigint, total_lesson_views bigint, total_meditations_completed bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.created_at,
    (SELECT MAX(session_date) FROM user_sessions us WHERE us.user_id = p.id) AS last_active,
    (SELECT COUNT(*) FROM checkins c WHERE c.user_id = p.id) AS total_checkins,
    (SELECT COUNT(*) FROM lesson_analytics la WHERE la.user_id = p.id AND la.action = 'view') AS total_lesson_views,
    (SELECT COUNT(DISTINCT (mae.meditation_id, mae.session_date)) FROM meditation_analytics_events mae WHERE mae.user_id = p.id AND mae.event_type = 'completed') AS total_meditations_completed
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;
