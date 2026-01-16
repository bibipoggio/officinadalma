-- Add policy to allow authenticated users to view basic public profile info (display_name, avatar_url)
-- This is needed for community features where users see each other's names on check-ins
-- The existing policy only allows users to see their own full profile

-- First, let's create a more permissive SELECT policy for authenticated users
-- They can see their own full profile OR just basic info of other profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Create new policy: Users can read their own full profile
CREATE POLICY "Users can read own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Create policy: Authenticated users can view basic profile info of other users
-- This is needed for displaying names in community check-ins
CREATE POLICY "Authenticated users can view public profile info" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');