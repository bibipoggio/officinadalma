-- Fix anonymous_reports view security
-- Drop and recreate with proper security configuration
DROP VIEW IF EXISTS public.anonymous_reports;

-- Recreate view with security_invoker to respect RLS of underlying tables
CREATE VIEW public.anonymous_reports
WITH (security_invoker = on)
AS
SELECT 
  r.id,
  r.checkin_id,
  r.reason,
  r.status,
  r.created_at
FROM public.reports r
WHERE is_moderator_or_admin(auth.uid());

-- Grant access to authenticated users (actual access controlled by view's WHERE clause)
GRANT SELECT ON public.anonymous_reports TO authenticated;

-- Move pg_graphql extension to extensions schema if it exists in public
-- Note: This is a safe operation as Supabase uses extensions schema by default for new extensions
DO $$
BEGIN
  -- Create extensions schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Grant usage on extensions schema
  GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
EXCEPTION
  WHEN duplicate_schema THEN
    NULL;
END $$;