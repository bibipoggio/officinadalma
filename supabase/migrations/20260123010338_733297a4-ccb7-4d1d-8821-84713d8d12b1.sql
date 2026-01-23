-- Add audio_url column for alternative audio-only playback in lessons
ALTER TABLE public.course_lessons 
ADD COLUMN audio_url text NULL;

-- Add audio duration for the audio track
ALTER TABLE public.course_lessons 
ADD COLUMN audio_duration_seconds integer NULL;

COMMENT ON COLUMN public.course_lessons.audio_url IS 'Alternative audio-only version of the lesson for podcast-style listening';
COMMENT ON COLUMN public.course_lessons.audio_duration_seconds IS 'Duration of the audio track in seconds';