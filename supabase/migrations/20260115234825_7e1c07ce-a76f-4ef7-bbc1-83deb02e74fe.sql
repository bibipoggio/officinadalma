-- Create a view for moderators to see reports WITHOUT reporter identity
CREATE OR REPLACE VIEW public.anonymous_reports AS
SELECT 
  id,
  checkin_id,
  reason,
  status,
  created_at
FROM public.reports;

-- Grant access to authenticated users (moderators will access through this view)
GRANT SELECT ON public.anonymous_reports TO authenticated;

-- Add a comment documenting the anonymous nature of reports
COMMENT ON VIEW public.anonymous_reports IS 'Anonymous view of reports for moderators - reporter identity is hidden to protect reporter privacy';

-- Update the reports table SELECT policy to be more restrictive
-- Only allow the reporter to see their own reports, not moderators directly
DROP POLICY IF EXISTS "Moderators and admins can view reports" ON public.reports;

-- Create new policy: reporters can see their own reports
CREATE POLICY "Users can view own reports" 
ON public.reports 
FOR SELECT 
USING (reporter_user_id = auth.uid());

-- Create a function for moderators to view reports anonymously
CREATE OR REPLACE FUNCTION public.get_anonymous_reports(p_status report_status DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  checkin_id uuid,
  reason text,
  status report_status,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.checkin_id, r.reason, r.status, r.created_at
  FROM reports r
  WHERE 
    is_moderator_or_admin(auth.uid())
    AND (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_anonymous_reports TO authenticated;