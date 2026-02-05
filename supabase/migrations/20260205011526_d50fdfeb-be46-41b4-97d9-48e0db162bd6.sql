-- Fix views to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies of the querying user are enforced

-- Recreate public_profiles view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = on) AS
SELECT 
  id,
  display_name,
  avatar_url
FROM public.profiles;

-- Recreate user_subscriptions view with security_invoker
DROP VIEW IF EXISTS public.user_subscriptions;
CREATE VIEW public.user_subscriptions
WITH (security_invoker = on) AS
SELECT 
  s.id,
  s.user_id,
  s.provider,
  s.trial_ends_at,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  CASE
    WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now() THEN 'trialing'::text
    WHEN s.current_period_end IS NOT NULL AND s.current_period_end > now() THEN 'active'::text
    ELSE 'inactive'::text
  END AS status
FROM subscriptions s
WHERE s.user_id = auth.uid();

-- Recreate anonymous_reports view with security_invoker
DROP VIEW IF EXISTS public.anonymous_reports;
CREATE VIEW public.anonymous_reports
WITH (security_invoker = on) AS
SELECT 
  r.id, 
  r.checkin_id, 
  r.reason, 
  r.status, 
  r.created_at
FROM reports r
WHERE is_moderator_or_admin(auth.uid());

-- Grant necessary permissions
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.anonymous_reports TO authenticated;