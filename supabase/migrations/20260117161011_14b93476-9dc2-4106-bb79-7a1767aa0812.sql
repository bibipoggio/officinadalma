-- Add image field to daily_content table
ALTER TABLE public.daily_content
ADD COLUMN cover_image_url TEXT;