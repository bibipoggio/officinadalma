-- Create enum for inscription status
CREATE TYPE public.inscricao_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Create inscricoes table
CREATE TABLE public.inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
  status inscricao_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

-- Users can read own inscription
CREATE POLICY "Users can read own inscricao"
ON public.inscricoes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert own inscription
CREATE POLICY "Users can insert own inscricao"
ON public.inscricoes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update own inscription (only while pending)
CREATE POLICY "Users can update own pending inscricao"
ON public.inscricoes FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pendente')
WITH CHECK (user_id = auth.uid());

-- Admins/moderators can view all inscricoes
CREATE POLICY "Admins can view all inscricoes"
ON public.inscricoes FOR SELECT
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- Admins/moderators can update inscricoes (approve/reject)
CREATE POLICY "Admins can update inscricoes"
ON public.inscricoes FOR UPDATE
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- No direct deletes
CREATE POLICY "No direct deletes on inscricoes"
ON public.inscricoes FOR DELETE
TO authenticated
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_inscricoes_updated_at
BEFORE UPDATE ON public.inscricoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();