-- Remove the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;

-- Create a public_profiles view with only non-sensitive fields
-- This view will be used for community features (showing names on check-ins)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
    id,
    display_name,
    avatar_url
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;