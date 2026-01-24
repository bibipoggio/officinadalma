-- Tabela para rastreamento de sessões
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  device_type TEXT,
  page_views INTEGER DEFAULT 1
);

-- Tabela de cache diário para analytics
CREATE TABLE public.analytics_daily_cache (
  date DATE PRIMARY KEY,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  forum_posts INTEGER DEFAULT 0,
  forum_replies INTEGER DEFAULT 0,
  diary_entries INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_start ON public.user_sessions(session_start DESC);
CREATE INDEX idx_user_sessions_session_date ON public.user_sessions(session_date);

-- Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

-- Políticas RLS para analytics_daily_cache
CREATE POLICY "Admins can view analytics"
ON public.analytics_daily_cache FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

CREATE POLICY "System can insert analytics"
ON public.analytics_daily_cache FOR INSERT
WITH CHECK (is_moderator_or_admin(auth.uid()));

CREATE POLICY "System can update analytics"
ON public.analytics_daily_cache FOR UPDATE
USING (is_moderator_or_admin(auth.uid()));

-- Trigger para preencher session_date automaticamente
CREATE OR REPLACE FUNCTION public.set_session_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_date := CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_session_date
BEFORE INSERT ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_session_date();

-- Função para obter métricas em tempo real
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total_users INTEGER;
  v_active_today INTEGER;
  v_active_month INTEGER;
  v_new_users_today INTEGER;
  v_new_users_month INTEGER;
  v_forum_topics_count INTEGER;
  v_forum_replies_count INTEGER;
  v_diary_entries_today INTEGER;
  v_diary_entries_month INTEGER;
BEGIN
  -- Verificar se é admin/moderador
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Total de usuários
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  
  -- Usuários ativos hoje (que têm sessão hoje)
  SELECT COUNT(DISTINCT user_id) INTO v_active_today 
  FROM user_sessions 
  WHERE session_date = CURRENT_DATE;
  
  -- Usuários ativos no mês
  SELECT COUNT(DISTINCT user_id) INTO v_active_month 
  FROM user_sessions 
  WHERE session_start >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Novos usuários hoje
  SELECT COUNT(*) INTO v_new_users_today 
  FROM profiles 
  WHERE created_at::date = CURRENT_DATE;
  
  -- Novos usuários no mês
  SELECT COUNT(*) INTO v_new_users_month 
  FROM profiles 
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Total de tópicos do fórum
  SELECT COUNT(*) INTO v_forum_topics_count 
  FROM forum_topics 
  WHERE is_deleted = false;
  
  -- Total de respostas do fórum
  SELECT COUNT(*) INTO v_forum_replies_count 
  FROM forum_replies 
  WHERE is_deleted = false;
  
  -- Entradas de diário hoje
  SELECT COUNT(*) INTO v_diary_entries_today 
  FROM checkins 
  WHERE created_at::date = CURRENT_DATE;
  
  -- Entradas de diário no mês
  SELECT COUNT(*) INTO v_diary_entries_month 
  FROM checkins 
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

  result := json_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'active_today', COALESCE(v_active_today, 0),
    'active_month', COALESCE(v_active_month, 0),
    'new_users_today', COALESCE(v_new_users_today, 0),
    'new_users_month', COALESCE(v_new_users_month, 0),
    'forum_topics', COALESCE(v_forum_topics_count, 0),
    'forum_replies', COALESCE(v_forum_replies_count, 0),
    'diary_entries_today', COALESCE(v_diary_entries_today, 0),
    'diary_entries_month', COALESCE(v_diary_entries_month, 0)
  );

  RETURN result;
END;
$$;

-- Função para obter histórico de acessos diários (últimos 30 dias)
CREATE OR REPLACE FUNCTION public.get_daily_access_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(access_date DATE, active_users BIGINT, new_users BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin/moderador
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS d
  ),
  daily_active AS (
    SELECT session_date, COUNT(DISTINCT user_id) AS users
    FROM user_sessions
    WHERE session_date >= CURRENT_DATE - days_back
    GROUP BY session_date
  ),
  daily_new AS (
    SELECT created_at::date AS signup_date, COUNT(*) AS users
    FROM profiles
    WHERE created_at >= CURRENT_DATE - days_back
    GROUP BY created_at::date
  )
  SELECT 
    ds.d AS access_date,
    COALESCE(da.users, 0) AS active_users,
    COALESCE(dn.users, 0) AS new_users
  FROM date_series ds
  LEFT JOIN daily_active da ON da.session_date = ds.d
  LEFT JOIN daily_new dn ON dn.signup_date = ds.d
  ORDER BY ds.d;
END;
$$;