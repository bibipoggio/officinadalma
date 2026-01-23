-- Add pdf_url column to course_lessons table for downloadable PDF attachments
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;