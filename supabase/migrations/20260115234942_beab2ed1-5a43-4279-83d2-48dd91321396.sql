-- Add policy for moderators to view reports through the view (without reporter_user_id exposed)
-- The view filters out the reporter_user_id column, so even with SELECT access, moderators can't see who reported
CREATE POLICY "Moderators can view reports via anonymous view" 
ON public.reports 
FOR SELECT 
USING (is_moderator_or_admin(auth.uid()));