-- Add new profile fields for birth information and contact
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_time time,
ADD COLUMN IF NOT EXISTS birth_city text,
ADD COLUMN IF NOT EXISTS birth_state text,
ADD COLUMN IF NOT EXISTS birth_country text,
ADD COLUMN IF NOT EXISTS phone text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.birth_date IS 'Data de nascimento do usuário';
COMMENT ON COLUMN public.profiles.birth_time IS 'Hora de nascimento (opcional)';
COMMENT ON COLUMN public.profiles.birth_city IS 'Cidade de nascimento';
COMMENT ON COLUMN public.profiles.birth_state IS 'Estado/Província de nascimento';
COMMENT ON COLUMN public.profiles.birth_country IS 'País de nascimento';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone para contato';