-- Add meditation_title column to daily_content table
ALTER TABLE public.daily_content 
ADD COLUMN IF NOT EXISTS meditation_title TEXT DEFAULT NULL;