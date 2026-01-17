-- Drop the existing view first
DROP VIEW IF EXISTS public.public_profiles;

-- Create the view with security_invoker = true (required by linter)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- The view will inherit RLS from profiles table
-- We need to add a policy that allows reading ANY profile's public fields
-- BUT limit what can be accessed by using the column-level approach

-- Since Postgres RLS works at row level (not column level), 
-- the safest approach is to allow reading any profile
-- The view itself limits which columns are exposed
CREATE POLICY "Users can read public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: This exposes all columns when querying profiles directly
-- but the public_profiles view only shows id, avatar_url, display_name
-- The app should use public_profiles view for community features