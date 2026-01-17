-- Recreate public_profiles view WITHOUT security_invoker 
-- This view only exposes public data (id, avatar_url, display_name) - no sensitive info
-- It needs to be readable by all authenticated users for community features
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_barrier = true)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- Grant select to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Revoke from anon to prevent unauthenticated access
REVOKE ALL ON public.public_profiles FROM anon;