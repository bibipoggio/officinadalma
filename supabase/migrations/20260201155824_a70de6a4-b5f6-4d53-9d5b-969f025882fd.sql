-- Fix public_profiles view security
-- The public_profiles is a view that shows limited user information (id, display_name, avatar_url)
-- It should be readable by authenticated users to display user info in the community

-- First, check if it's a view and recreate with security_invoker
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url
FROM public.profiles p;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.public_profiles IS 'Public view of user profiles showing only non-sensitive information (id, display_name, avatar_url). Uses security_invoker to respect RLS on underlying profiles table.';