-- Drop existing INSERT policy (uses public role)
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;

-- Recreate INSERT policy for authenticated role only
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Drop existing UPDATE policy (uses public role)
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;

-- Recreate UPDATE policy for authenticated role only
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());