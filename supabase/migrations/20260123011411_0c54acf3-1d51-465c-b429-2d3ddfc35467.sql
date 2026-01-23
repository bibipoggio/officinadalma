-- Recreate views with SECURITY INVOKER to fix the security warning
-- The underlying functions already handle security, so views don't need SECURITY DEFINER

-- Drop and recreate public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT id, avatar_url, display_name
FROM get_all_public_profiles();

-- Drop and recreate anonymous_reports view  
DROP VIEW IF EXISTS public.anonymous_reports;
CREATE VIEW public.anonymous_reports
WITH (security_invoker = true)
AS
SELECT id, checkin_id, reason, status, created_at
FROM get_anonymous_reports();

-- Drop and recreate user_subscriptions view
DROP VIEW IF EXISTS public.user_subscriptions;
CREATE VIEW public.user_subscriptions
WITH (security_invoker = true)
AS
SELECT id, user_id, provider, trial_ends_at, current_period_end, created_at, updated_at, status
FROM get_user_subscription();