-- Add DELETE policy for reports table - only admins can delete
CREATE POLICY "Only admins can delete reports" 
ON public.reports 
FOR DELETE 
USING (is_admin(auth.uid()));