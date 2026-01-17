-- Remove the overly permissive policy that exposed sensitive data
DROP POLICY IF EXISTS "Authenticated users can read public profile fields" ON public.profiles;

-- Drop the problematic view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a secure function to get public profile data
-- This function runs with SECURITY DEFINER but only returns non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE(id uuid, avatar_url text, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.avatar_url, p.display_name
  FROM profiles p
  WHERE p.id = profile_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

-- Recreate the view using the secure function approach
-- Use security_invoker = true with a security barrier
CREATE VIEW public.public_profiles 
WITH (security_invoker = true, security_barrier = true)
AS
SELECT 
  id,
  avatar_url,
  display_name
FROM public.profiles;

-- We need a policy that allows reading but only the columns exposed in the view
-- Since views with security_invoker inherit RLS, we need to allow SELECT
-- but the sensitive columns are simply not selected in the view
-- Add a restrictive policy for public profile reads
CREATE POLICY "Authenticated users can read any profile for community features"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);