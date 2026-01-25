-- Add column for multiple text files URLs (as JSONB array)
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS text_files_urls jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.course_lessons.text_files_urls IS 'Array of text file URLs for downloadable materials';