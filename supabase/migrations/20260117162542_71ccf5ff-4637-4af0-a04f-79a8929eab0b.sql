-- Remove the overly permissive policy - this was exposing sensitive data
DROP POLICY IF EXISTS "Authenticated users can read any profile for community features" ON public.profiles;

-- The profiles table should only allow users to read their OWN profile
-- The existing "Users can read own profile" policy already handles this

-- For community features (showing other users' names/avatars), 
-- the app should use the get_public_profile function which only returns safe fields

-- Drop the view that requires the permissive policy
DROP VIEW IF EXISTS public.public_profiles;

-- Create the view directly from the function for better security
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  avatar_url, 
  display_name
FROM public.profiles;

-- The view will work because we'll grant direct select to authenticated
-- but with security_barrier to prevent column inference attacks
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_barrier = true, security_invoker = false)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- Grant select on the view (bypasses RLS on underlying table when security_invoker = false)
GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE SELECT ON public.public_profiles FROM anon;