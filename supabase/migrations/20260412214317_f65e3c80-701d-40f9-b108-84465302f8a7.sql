
CREATE TABLE public.meditacoes_compradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meditation_id UUID NOT NULL REFERENCES public.daily_content(id) ON DELETE CASCADE,
  status purchase_status NOT NULL DEFAULT 'pendente',
  provider_payment_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 1593,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, meditation_id)
);

ALTER TABLE public.meditacoes_compradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meditation purchases"
ON public.meditacoes_compradas
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all meditation purchases"
ON public.meditacoes_compradas
FOR SELECT TO authenticated
USING (is_moderator_or_admin(auth.uid()));

CREATE POLICY "No direct user inserts on meditation purchases"
ON public.meditacoes_compradas
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct user updates on meditation purchases"
ON public.meditacoes_compradas
FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "No direct user deletes on meditation purchases"
ON public.meditacoes_compradas
FOR DELETE TO authenticated
USING (false);

CREATE TRIGGER update_meditacoes_compradas_updated_at
BEFORE UPDATE ON public.meditacoes_compradas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
