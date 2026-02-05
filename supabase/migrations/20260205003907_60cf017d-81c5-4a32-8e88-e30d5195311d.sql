-- Create table to track daily meditation plays
CREATE TABLE public.daily_content_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_content_id UUID NOT NULL REFERENCES public.daily_content(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('play', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, daily_content_id, action)
);

-- Enable RLS
ALTER TABLE public.daily_content_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert own analytics"
ON public.daily_content_analytics
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics"
ON public.daily_content_analytics
FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

-- Create enhanced analytics function with time filtering
CREATE OR REPLACE FUNCTION public.get_enhanced_analytics(
  p_period TEXT DEFAULT 'all' -- 'today', 'week', 'month', 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_total_users INTEGER;
  v_new_users INTEGER;
  v_active_today INTEGER;
  v_checkins_today INTEGER;
  v_checkins_unique_users INTEGER;
  v_meditation_plays INTEGER;
  v_meditation_unique_users INTEGER;
BEGIN
  -- Verify admin access
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Set start date based on period
  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE::TIMESTAMP WITH TIME ZONE
    WHEN 'week' THEN (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE
    WHEN 'month' THEN DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMP WITH TIME ZONE
    ELSE '1970-01-01'::TIMESTAMP WITH TIME ZONE
  END;

  -- Total registered users
  SELECT COUNT(*) INTO v_total_users FROM profiles;

  -- New users in period
  SELECT COUNT(*) INTO v_new_users 
  FROM profiles 
  WHERE created_at >= v_start_date;

  -- Active users today (from sessions)
  SELECT COUNT(DISTINCT user_id) INTO v_active_today 
  FROM user_sessions 
  WHERE session_date = CURRENT_DATE;

  -- Check-ins today
  SELECT COUNT(*) INTO v_checkins_today 
  FROM checkins 
  WHERE created_at::date = CURRENT_DATE;

  -- Unique users who did check-in today
  SELECT COUNT(DISTINCT user_id) INTO v_checkins_unique_users 
  FROM checkins 
  WHERE created_at::date = CURRENT_DATE;

  -- Meditation plays today
  SELECT COUNT(*) INTO v_meditation_plays 
  FROM daily_content_analytics 
  WHERE action = 'play' 
  AND created_at::date = CURRENT_DATE;

  -- Unique users who played meditation today
  SELECT COUNT(DISTINCT user_id) INTO v_meditation_unique_users 
  FROM daily_content_analytics 
  WHERE action = 'play' 
  AND created_at::date = CURRENT_DATE;

  result := json_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'new_users', COALESCE(v_new_users, 0),
    'active_today', COALESCE(v_active_today, 0),
    'checkins_today', COALESCE(v_checkins_today, 0),
    'checkins_unique_users', COALESCE(v_checkins_unique_users, 0),
    'meditation_plays', COALESCE(v_meditation_plays, 0),
    'meditation_unique_users', COALESCE(v_meditation_unique_users, 0)
  );

  RETURN result;
END;
$$;

-- Function to get users list for export
CREATE OR REPLACE FUNCTION public.get_users_list()
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_active DATE,
  total_checkins BIGINT,
  total_lesson_views BIGINT
)
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
    (SELECT COUNT(*) FROM lesson_analytics la WHERE la.user_id = p.id AND la.action = 'view') AS total_lesson_views
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to get new users history by period
CREATE OR REPLACE FUNCTION public.get_new_users_history(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  new_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS d
  )
  SELECT 
    ds.d AS date,
    COALESCE(COUNT(p.id), 0) AS new_users
  FROM date_series ds
  LEFT JOIN profiles p ON p.created_at::date = ds.d
  GROUP BY ds.d
  ORDER BY ds.d;
END;
$$;