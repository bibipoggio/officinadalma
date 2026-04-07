
-- 1. Create meditation_analytics_events table
CREATE TABLE public.meditation_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meditation_id text NOT NULL,
  event_type text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  progress_percent integer,
  progress_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dedup index: one completed per user/meditation/day
CREATE UNIQUE INDEX idx_meditation_events_dedup 
  ON public.meditation_analytics_events (user_id, meditation_id, session_date, event_type)
  WHERE event_type = 'completed';

CREATE INDEX idx_meditation_events_type_date 
  ON public.meditation_analytics_events (event_type, session_date);

ALTER TABLE public.meditation_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON public.meditation_analytics_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all events" ON public.meditation_analytics_events
  FOR SELECT TO authenticated USING (is_moderator_or_admin(auth.uid()));

-- 2. Update get_enhanced_analytics to include enraizamento plays
CREATE OR REPLACE FUNCTION public.get_enhanced_analytics(p_period text DEFAULT 'all')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  v_enraizamento_plays INTEGER;
  v_enraizamento_unique_users INTEGER;
BEGIN
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE::TIMESTAMP WITH TIME ZONE
    WHEN 'week' THEN (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE
    WHEN 'month' THEN DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMP WITH TIME ZONE
    ELSE '1970-01-01'::TIMESTAMP WITH TIME ZONE
  END;

  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_new_users FROM profiles WHERE created_at >= v_start_date;
  SELECT COUNT(DISTINCT user_id) INTO v_active_today FROM user_sessions WHERE session_date = CURRENT_DATE;
  SELECT COUNT(*) INTO v_checkins_today FROM checkins WHERE created_at::date = CURRENT_DATE;
  SELECT COUNT(DISTINCT user_id) INTO v_checkins_unique_users FROM checkins WHERE created_at::date = CURRENT_DATE;

  -- Meditation plays (from meditation_analytics_events)
  SELECT COUNT(*) INTO v_meditation_plays
  FROM meditation_analytics_events
  WHERE event_type = 'play_started' AND created_at >= v_start_date;

  SELECT COUNT(DISTINCT user_id) INTO v_meditation_unique_users
  FROM meditation_analytics_events
  WHERE event_type = 'play_started' AND created_at >= v_start_date;

  -- Enraizamento plays (from daily_content_analytics)
  SELECT COUNT(*) INTO v_enraizamento_plays
  FROM daily_content_analytics
  WHERE action = 'enraizamento_play' AND created_at >= v_start_date;

  SELECT COUNT(DISTINCT user_id) INTO v_enraizamento_unique_users
  FROM daily_content_analytics
  WHERE action = 'enraizamento_play' AND created_at >= v_start_date;

  result := json_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'new_users', COALESCE(v_new_users, 0),
    'active_today', COALESCE(v_active_today, 0),
    'checkins_today', COALESCE(v_checkins_today, 0),
    'checkins_unique_users', COALESCE(v_checkins_unique_users, 0),
    'meditation_plays', COALESCE(v_meditation_plays, 0),
    'meditation_unique_users', COALESCE(v_meditation_unique_users, 0),
    'enraizamento_plays', COALESCE(v_enraizamento_plays, 0),
    'enraizamento_unique_users', COALESCE(v_enraizamento_unique_users, 0)
  );

  RETURN result;
END;
$$;

-- 3. Create meditation funnel analytics function
CREATE OR REPLACE FUNCTION public.get_meditation_funnel_analytics(p_period text DEFAULT 'all')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_opened BIGINT;
  v_play_started BIGINT;
  v_completed BIGINT;
  v_unique_completed BIGINT;
BEGIN
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE::TIMESTAMP WITH TIME ZONE
    WHEN 'week' THEN (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE
    WHEN 'month' THEN DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMP WITH TIME ZONE
    ELSE '1970-01-01'::TIMESTAMP WITH TIME ZONE
  END;

  SELECT COUNT(*) INTO v_opened FROM meditation_analytics_events WHERE event_type = 'opened' AND created_at >= v_start_date;
  SELECT COUNT(*) INTO v_play_started FROM meditation_analytics_events WHERE event_type = 'play_started' AND created_at >= v_start_date;
  SELECT COUNT(*) INTO v_completed FROM meditation_analytics_events WHERE event_type = 'completed' AND created_at >= v_start_date;
  SELECT COUNT(DISTINCT user_id) INTO v_unique_completed FROM meditation_analytics_events WHERE event_type = 'completed' AND created_at >= v_start_date;

  result := json_build_object(
    'opened', COALESCE(v_opened, 0),
    'play_started', COALESCE(v_play_started, 0),
    'completed', COALESCE(v_completed, 0),
    'unique_completed_users', COALESCE(v_unique_completed, 0),
    'avg_per_user', CASE WHEN v_unique_completed > 0 THEN ROUND(v_completed::numeric / v_unique_completed, 1) ELSE 0 END,
    'rate_open_to_play', CASE WHEN v_opened > 0 THEN ROUND((v_play_started::numeric / v_opened) * 100, 1) ELSE 0 END,
    'rate_play_to_complete', CASE WHEN v_play_started > 0 THEN ROUND((v_completed::numeric / v_play_started) * 100, 1) ELSE 0 END,
    'rate_open_to_complete', CASE WHEN v_opened > 0 THEN ROUND((v_completed::numeric / v_opened) * 100, 1) ELSE 0 END
  );

  RETURN result;
END;
$$;

-- 4. Update get_users_list to count from meditation_analytics_events
CREATE OR REPLACE FUNCTION public.get_users_list()
RETURNS TABLE(id uuid, display_name text, created_at timestamptz, last_active date, total_checkins bigint, total_lesson_views bigint, total_meditations_completed bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    (SELECT COUNT(*) FROM meditation_analytics_events mae WHERE mae.user_id = p.id AND mae.event_type = 'completed') AS total_meditations_completed
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Function to get active users list for today
CREATE OR REPLACE FUNCTION public.get_active_users_today()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, session_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    p.display_name,
    p.avatar_url,
    COUNT(*) AS session_count
  FROM user_sessions us
  JOIN profiles p ON p.id = us.user_id
  WHERE us.session_date = CURRENT_DATE
  GROUP BY us.user_id, p.display_name, p.avatar_url
  ORDER BY MAX(us.session_start) DESC;
END;
$$;
