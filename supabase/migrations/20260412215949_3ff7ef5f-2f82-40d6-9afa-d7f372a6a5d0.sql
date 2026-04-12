
CREATE OR REPLACE FUNCTION public.get_admin_inscricoes()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  respostas jsonb,
  status inscricao_status,
  subscription_status text,
  provider_subscription_id text,
  created_at timestamptz,
  updated_at timestamptz
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
    i.id,
    i.user_id,
    p.display_name,
    au.email::text,
    i.respostas,
    i.status,
    CASE
      WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now() THEN 'trialing'
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end > now() THEN 'active'
      WHEN s.id IS NOT NULL THEN 'inactive'
      ELSE 'none'
    END AS subscription_status,
    s.provider_subscription_id,
    i.created_at,
    i.updated_at
  FROM inscricoes i
  LEFT JOIN profiles p ON p.id = i.user_id
  LEFT JOIN auth.users au ON au.id = i.user_id
  LEFT JOIN subscriptions s ON s.user_id = i.user_id
  ORDER BY i.created_at DESC;
END;
$$;
