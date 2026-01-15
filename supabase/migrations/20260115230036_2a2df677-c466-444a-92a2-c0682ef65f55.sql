-- Fix security warnings: set search_path for validation functions
CREATE OR REPLACE FUNCTION public.validate_lesson_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate media_url is required for video/audio content types
  IF NEW.content_type IN ('video', 'audio') AND (NEW.media_url IS NULL OR NEW.media_url = '') THEN
    RAISE EXCEPTION 'media_url is required for video and audio content types';
  END IF;
  
  -- Validate body_markdown is required for text content type
  IF NEW.content_type = 'text' AND (NEW.body_markdown IS NULL OR NEW.body_markdown = '') THEN
    RAISE EXCEPTION 'body_markdown is required for text content type';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_lesson_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Auto-set completed_at when progress reaches 100
  IF NEW.progress_percent = 100 AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  
  -- Clear completed_at if progress drops below 100
  IF NEW.progress_percent < 100 THEN
    NEW.completed_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;