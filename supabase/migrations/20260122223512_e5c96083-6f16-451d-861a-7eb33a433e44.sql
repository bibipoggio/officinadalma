
-- Fix anonymous_reports view to only allow moderators/admins
-- The view already exists, but it selects from reports without going through RLS
-- Since the reports table has RLS that only allows moderators/admins to view all reports,
-- we need to drop and recreate the view to use the get_anonymous_reports() function instead

DROP VIEW IF EXISTS public.anonymous_reports;

CREATE VIEW public.anonymous_reports AS
SELECT * FROM get_anonymous_reports();

-- Fix user_subscriptions view to only show current user's subscription
-- First create a SECURITY DEFINER function that respects user access

CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  provider subscription_provider,
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Recreate the view to use the secure function
DROP VIEW IF EXISTS public.user_subscriptions;

CREATE VIEW public.user_subscriptions AS
SELECT * FROM get_user_subscription();

-- Grant access to the functions
GRANT EXECUTE ON FUNCTION public.get_user_subscription() TO authenticated;
