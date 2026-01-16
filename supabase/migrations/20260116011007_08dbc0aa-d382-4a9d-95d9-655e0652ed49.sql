-- Drop and recreate the anonymous_reports view with security_invoker = true
-- This ensures the view respects RLS policies on the underlying 'reports' table
DROP VIEW IF EXISTS public.anonymous_reports;

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

-- Add a policy to allow moderators/admins to view reports
-- (The reports table already has RLS enabled, but let's ensure moderators can see all reports)
CREATE POLICY "Moderators and admins can view all reports"
ON public.reports
FOR SELECT
USING (is_moderator_or_admin(auth.uid()));