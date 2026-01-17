-- Recreate public_profiles view with security_invoker to inherit RLS from profiles table
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Recreate user_subscriptions view with security_invoker to inherit RLS from subscriptions table
DROP VIEW IF EXISTS public.user_subscriptions;
CREATE VIEW public.user_subscriptions
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  provider,
  trial_ends_at,
  current_period_end,
  created_at,
  updated_at,
  CASE 
    WHEN trial_ends_at IS NOT NULL AND trial_ends_at > now() THEN 'trialing'
    WHEN current_period_end IS NOT NULL AND current_period_end > now() THEN 'active'
    ELSE 'inactive'
  END as status
FROM public.subscriptions;

-- Grant access to authenticated users  
GRANT SELECT ON public.user_subscriptions TO authenticated;