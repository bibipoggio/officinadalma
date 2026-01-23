-- Fix course_enrollments access_type constraint to allow 'enrolled' for basic course enrollments
ALTER TABLE public.course_enrollments 
DROP CONSTRAINT course_enrollments_access_type_check;

ALTER TABLE public.course_enrollments 
ADD CONSTRAINT course_enrollments_access_type_check 
CHECK (access_type = ANY (ARRAY['enrolled'::text, 'premium'::text, 'paid_aparte'::text]));