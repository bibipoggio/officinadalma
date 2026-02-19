-- Recreate public_profiles view with security_invoker = true
-- This ensures the view respects RLS policies of underlying tables
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS SELECT p.id, p.display_name, p.avatar_url
FROM profiles p;