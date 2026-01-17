-- Remove the overly permissive policy that exposes sensitive columns
DROP POLICY IF EXISTS "Users can read public profile data" ON public.profiles;

-- Drop the current view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a table-returning function that only returns public data
-- This function uses SECURITY DEFINER to bypass RLS but only exposes safe columns
CREATE OR REPLACE FUNCTION public.get_all_public_profiles()
RETURNS TABLE(id uuid, avatar_url text, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.avatar_url, p.display_name
  FROM profiles p;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_public_profiles() TO authenticated;

-- Create the view that calls the secure function
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT * FROM public.get_all_public_profiles();

-- Grant select on the view
GRANT SELECT ON public.public_profiles TO authenticated;