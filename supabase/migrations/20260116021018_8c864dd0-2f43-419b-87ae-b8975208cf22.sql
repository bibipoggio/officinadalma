-- Drop and recreate the view with SECURITY INVOKER to fix the security definer warning
DROP VIEW IF EXISTS public.user_subscriptions;

CREATE VIEW public.user_subscriptions 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  provider,
  current_period_end,
  trial_ends_at,
  created_at,
  updated_at,
  CASE 
    WHEN trial_ends_at IS NOT NULL AND trial_ends_at > now() THEN 'trial'
    WHEN current_period_end IS NOT NULL AND current_period_end > now() THEN 'active'
    ELSE 'expired'
  END as status
FROM public.subscriptions;

-- Grant select access to authenticated users
GRANT SELECT ON public.user_subscriptions TO authenticated;

COMMENT ON VIEW public.user_subscriptions IS 'Safe view for user subscriptions that hides sensitive provider IDs';