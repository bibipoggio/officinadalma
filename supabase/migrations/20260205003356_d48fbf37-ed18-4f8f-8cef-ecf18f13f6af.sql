-- Drop and recreate the public_profiles view WITHOUT security_invoker
-- This allows the view to return public profile data for all users
-- The view itself only exposes safe columns (id, display_name, avatar_url)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Public profile information visible to all authenticated users. Only exposes safe columns.';