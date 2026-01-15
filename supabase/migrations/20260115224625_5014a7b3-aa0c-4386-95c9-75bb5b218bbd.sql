-- Add RLS policies for subscriptions table to protect payment data
-- Write operations should only be allowed via service role (backend/edge functions)
-- Users should never be able to modify their own subscription data directly

-- Policy: Block all user INSERT operations (only service role can insert)
CREATE POLICY "No direct user inserts on subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Policy: Block all user UPDATE operations (only service role can update)
CREATE POLICY "No direct user updates on subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Policy: Block all user DELETE operations (only service role can delete)
CREATE POLICY "No direct user deletes on subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);