-- Tabela de analytics de aulas (design minimalista)
CREATE TABLE public.lesson_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices otimizados para queries rápidas
CREATE INDEX idx_lesson_analytics_lesson_id ON public.lesson_analytics(lesson_id);
CREATE INDEX idx_lesson_analytics_user_id ON public.lesson_analytics(user_id);
CREATE INDEX idx_lesson_analytics_action ON public.lesson_analytics(action);
CREATE INDEX idx_lesson_analytics_created_at ON public.lesson_analytics(created_at DESC);

-- Índice composto para queries de ranking
CREATE INDEX idx_lesson_analytics_lesson_action ON public.lesson_analytics(lesson_id, action);

-- Enable RLS
ALTER TABLE public.lesson_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own analytics"
ON public.lesson_analytics FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics"
ON public.lesson_analytics FOR SELECT
USING (is_moderator_or_admin(auth.uid()));

-- Função para obter métricas de aulas (otimizada)
CREATE OR REPLACE FUNCTION public.get_lesson_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_total_views INTEGER;
  v_total_completions INTEGER;
  v_unique_users INTEGER;
BEGIN
  -- Verificar permissão
  IF NOT is_moderator_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Total de visualizações
  SELECT COUNT(*) INTO v_total_views 
  FROM lesson_analytics 
  WHERE action = 'view';

  -- Total de conclusões
  SELECT COUNT(*) INTO v_total_completions 
  FROM lesson_analytics 
  WHERE action = 'complete';

  -- Usuários únicos engajados
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users 
  FROM lesson_analytics;

  result := json_build_object(
    'total_views', COALESCE(v_total_views, 0),
    'total_completions', COALESCE(v_total_completions, 0),
    'unique_users', COALESCE(v_unique_users, 0),
    'completion_rate', CASE 
      WHEN v_total_views > 0 THEN ROUND((v_total_completions::NUMERIC / v_total_views) * 100, 1)
      ELSE 0 
    END
  );

  RETURN result;
END;
$$;

-- Função para top aulas mais acessadas
CREATE OR REPLACE FUNCTION public.get_top_lessons(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  lesson_id UUID,
  lesson_title TEXT,
  course_title TEXT,
  view_count BIGINT,
  completion_count BIGINT
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
    la.lesson_id,
    cl.title AS lesson_title,
    c.title AS course_title,
    COUNT(*) FILTER (WHERE la.action = 'view') AS view_count,
    COUNT(*) FILTER (WHERE la.action = 'complete') AS completion_count
  FROM lesson_analytics la
  JOIN course_lessons cl ON cl.id = la.lesson_id
  JOIN courses c ON c.id = cl.course_id
  GROUP BY la.lesson_id, cl.title, c.title
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$$;

-- Função para progresso médio por curso
CREATE OR REPLACE FUNCTION public.get_course_engagement()
RETURNS TABLE(
  course_id UUID,
  course_title TEXT,
  total_lessons BIGINT,
  avg_progress NUMERIC,
  enrolled_users BIGINT
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
    c.id AS course_id,
    c.title AS course_title,
    COUNT(DISTINCT cl.id) AS total_lessons,
    COALESCE(AVG(lp.progress_percent), 0) AS avg_progress,
    COUNT(DISTINCT ce.user_id) AS enrolled_users
  FROM courses c
  LEFT JOIN course_lessons cl ON cl.course_id = c.id AND cl.is_published = true
  LEFT JOIN lesson_progress lp ON lp.lesson_id = cl.id
  LEFT JOIN course_enrollments ce ON ce.course_id = c.id
  WHERE c.is_published = true
  GROUP BY c.id, c.title
  ORDER BY enrolled_users DESC;
END;
$$;