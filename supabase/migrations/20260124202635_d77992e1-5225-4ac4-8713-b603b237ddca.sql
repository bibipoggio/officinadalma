-- Tabela de tópicos do fórum
CREATE TABLE public.forum_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  report_count INTEGER DEFAULT 0 NOT NULL
);

-- Tabela de respostas do fórum
CREATE TABLE public.forum_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  report_count INTEGER DEFAULT 0 NOT NULL
);

-- Tabela de denúncias do fórum (para rastrear quem denunciou o quê)
CREATE TABLE public.forum_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  CONSTRAINT check_topic_or_reply CHECK (
    (topic_id IS NOT NULL AND reply_id IS NULL) OR 
    (topic_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_forum_topics_created_at ON public.forum_topics(created_at DESC);
CREATE INDEX idx_forum_topics_not_deleted ON public.forum_topics(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_forum_replies_topic_id ON public.forum_replies(topic_id, created_at);
CREATE INDEX idx_forum_replies_not_deleted ON public.forum_replies(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_forum_reports_status ON public.forum_reports(status);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

-- Políticas para forum_topics
CREATE POLICY "Users can view non-deleted topics"
ON public.forum_topics FOR SELECT
USING (is_deleted = FALSE OR is_moderator_or_admin(auth.uid()));

CREATE POLICY "Authenticated users can create topics"
ON public.forum_topics FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Moderators can update topics"
ON public.forum_topics FOR UPDATE
USING (is_moderator_or_admin(auth.uid()));

CREATE POLICY "Moderators can delete topics"
ON public.forum_topics FOR DELETE
USING (is_moderator_or_admin(auth.uid()));

-- Políticas para forum_replies
CREATE POLICY "Users can view non-deleted replies"
ON public.forum_replies FOR SELECT
USING (is_deleted = FALSE OR is_moderator_or_admin(auth.uid()));

CREATE POLICY "Authenticated users can create replies"
ON public.forum_replies FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Moderators can update replies"
ON public.forum_replies FOR UPDATE
USING (is_moderator_or_admin(auth.uid()));

CREATE POLICY "Moderators can delete replies"
ON public.forum_replies FOR DELETE
USING (is_moderator_or_admin(auth.uid()));

-- Políticas para forum_reports
CREATE POLICY "Users can create reports"
ON public.forum_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
ON public.forum_reports FOR SELECT
USING (reporter_id = auth.uid() OR is_moderator_or_admin(auth.uid()));

CREATE POLICY "Moderators can update reports"
ON public.forum_reports FOR UPDATE
USING (is_moderator_or_admin(auth.uid()));

-- Função para incrementar report_count
CREATE OR REPLACE FUNCTION public.increment_forum_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    UPDATE forum_topics SET report_count = report_count + 1 WHERE id = NEW.topic_id;
  ELSIF NEW.reply_id IS NOT NULL THEN
    UPDATE forum_replies SET report_count = report_count + 1 WHERE id = NEW.reply_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para incrementar contagem de denúncias
CREATE TRIGGER trigger_increment_report_count
AFTER INSERT ON public.forum_reports
FOR EACH ROW
EXECUTE FUNCTION public.increment_forum_report_count();

-- Trigger para updated_at
CREATE TRIGGER update_forum_topics_updated_at
BEFORE UPDATE ON public.forum_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
BEFORE UPDATE ON public.forum_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();