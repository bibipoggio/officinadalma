-- Fix user_roles SELECT policy to require explicit authentication
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix subscriptions SELECT policy to require explicit authentication  
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());