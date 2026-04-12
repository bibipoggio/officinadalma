
-- Create enum for purchase status
CREATE TYPE public.purchase_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Create table for individual lesson purchases
CREATE TABLE public.aulas_compradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  status purchase_status NOT NULL DEFAULT 'pendente',
  provider_payment_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 2975,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.aulas_compradas ENABLE ROW LEVEL SECURITY;

-- Users can read their own purchases
CREATE POLICY "Users can read own purchases"
ON public.aulas_compradas
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.aulas_compradas
FOR SELECT
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- No direct user inserts (webhook only via service role)
CREATE POLICY "No direct user inserts"
ON public.aulas_compradas
FOR INSERT
TO authenticated
WITH CHECK (false);

-- No direct user updates
CREATE POLICY "No direct user updates"
ON public.aulas_compradas
FOR UPDATE
TO authenticated
USING (false);

-- No direct user deletes
CREATE POLICY "No direct user deletes"
ON public.aulas_compradas
FOR DELETE
TO authenticated
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_aulas_compradas_updated_at
BEFORE UPDATE ON public.aulas_compradas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
