-- Change notification_enabled default to true for new users
ALTER TABLE public.profiles 
ALTER COLUMN notification_enabled SET DEFAULT true;