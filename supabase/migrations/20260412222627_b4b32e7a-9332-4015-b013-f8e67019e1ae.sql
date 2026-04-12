
-- Add videos JSONB array to course_lessons
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.course_lessons.videos IS 'Array of video objects: [{url, title, position}]. Max 10 items.';

-- Create lesson_video_progress table for per-video progress tracking
CREATE TABLE public.lesson_video_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  video_index integer NOT NULL,
  last_position_seconds integer NOT NULL DEFAULT 0,
  progress_percent integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id, video_index)
);

-- Enable RLS
ALTER TABLE public.lesson_video_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video progress"
ON public.lesson_video_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own video progress"
ON public.lesson_video_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own video progress"
ON public.lesson_video_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all for analytics
CREATE POLICY "Admins can view all video progress"
ON public.lesson_video_progress FOR SELECT
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_lesson_video_progress_updated_at
BEFORE UPDATE ON public.lesson_video_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_lesson_video_progress_user_lesson 
ON public.lesson_video_progress(user_id, lesson_id);

-- Migrate existing media_url data into videos array
UPDATE public.course_lessons
SET videos = jsonb_build_array(
  jsonb_build_object(
    'url', media_url,
    'title', title,
    'position', 0
  )
)
WHERE media_url IS NOT NULL 
  AND media_url != '' 
  AND (videos IS NULL OR videos = '[]'::jsonb);
