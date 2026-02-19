
-- Add is_suspended to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Create role_audit_log table
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  old_role text,
  new_role text,
  old_is_suspended boolean,
  new_is_suspended boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
ON public.role_audit_log
FOR SELECT
USING (is_admin(auth.uid()));

-- No direct inserts/updates/deletes from client (only via edge function with service role)
CREATE POLICY "No direct inserts on audit log"
ON public.role_audit_log
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct updates on audit log"
ON public.role_audit_log
FOR UPDATE
USING (false);

CREATE POLICY "No direct deletes on audit log"
ON public.role_audit_log
FOR DELETE
USING (false);

-- Create admin function to list users with email (joins auth.users)
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE(
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  is_suspended boolean,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    au.email::text,
    p.display_name,
    p.avatar_url,
    p.is_suspended,
    COALESCE(
      (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.id ORDER BY 
        CASE ur.role 
          WHEN 'admin' THEN 1 
          WHEN 'moderator' THEN 2 
          ELSE 3 
        END 
        LIMIT 1),
      'user'
    ) AS role,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
