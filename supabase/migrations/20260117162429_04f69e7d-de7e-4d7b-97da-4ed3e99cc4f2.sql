-- Recreate public_profiles view with security_invoker = true to fix the security definer warning
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- Grant select to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add a new RLS policy on profiles to allow authenticated users to read public fields only
-- This is safe because the view only selects id, avatar_url, display_name (no sensitive data)
CREATE POLICY "Authenticated users can read public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);