-- Drop the SECURITY DEFINER view and recreate with INVOKER
DROP VIEW IF EXISTS public.anonymous_reports;

-- Recreate view with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW public.anonymous_reports 
WITH (security_invoker = true)
AS
SELECT 
  id,
  checkin_id,
  reason,
  status,
  created_at
FROM public.reports;

-- Grant select to authenticated users
GRANT SELECT ON public.anonymous_reports TO authenticated;

-- Add comment
COMMENT ON VIEW public.anonymous_reports IS 'Anonymous view of reports for moderators - reporter identity is hidden to protect reporter privacy';