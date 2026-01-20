-- First drop the existing type constraint on courses
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_type_check;

-- Add updated type constraint with 'basic' option
ALTER TABLE public.courses ADD CONSTRAINT courses_type_check 
  CHECK (type IN ('premium', 'aparte', 'basic'));

-- Create the "Pérolas de Sabedoria" course as a basic course
INSERT INTO public.courses (
  route_slug, 
  title, 
  type, 
  description_short, 
  is_published
) VALUES (
  'perolas-de-sabedoria',
  'Pérolas de Sabedoria',
  'basic',
  'Pequenas reflexões diárias para nutrir sua alma e iluminar seu caminho.',
  true
);

-- Create a default module for the course
INSERT INTO public.course_modules (
  course_id,
  title,
  description,
  position,
  is_published
) 
SELECT 
  c.id,
  'Primeiras Pérolas',
  'As primeiras reflexões para começar sua jornada.',
  1,
  true
FROM public.courses c 
WHERE c.route_slug = 'perolas-de-sabedoria';