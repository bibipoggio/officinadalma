-- Add RLS policies to anonymous_reports view
-- This view is used by moderators to see reports without exposing reporter identity

-- Enable RLS on the view (if not already enabled)
ALTER VIEW public.anonymous_reports SET (security_invoker = on);

-- Since anonymous_reports is a view, we need to ensure the base table (reports) 
-- has proper policies. The reports table already has policies, but let's verify
-- the view is properly secured by recreating it with security_invoker

-- Drop and recreate the view with proper security settings
DROP VIEW IF EXISTS public.anonymous_reports;

CREATE VIEW public.anonymous_reports 
WITH (security_invoker = on) AS
SELECT 
  r.id,
  r.checkin_id,
  r.reason,
  r.status,
  r.created_at
FROM public.reports r
WHERE is_moderator_or_admin(auth.uid());