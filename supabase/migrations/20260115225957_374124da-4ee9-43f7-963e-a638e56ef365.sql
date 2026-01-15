-- =============================================
-- COURSE MODULES TABLE
-- =============================================
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL CHECK (position >= 1),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_modules_course_position_unique UNIQUE (course_id, position)
);

-- Enable RLS
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT only published modules from published courses
CREATE POLICY "Users can view published modules from published courses"
ON public.course_modules FOR SELECT
TO authenticated
USING (
  is_published = true 
  AND EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_modules.course_id 
    AND courses.is_published = true
  )
);

-- RLS: INSERT only for moderators/admins
CREATE POLICY "Moderators and admins can insert modules"
ON public.course_modules FOR INSERT
TO authenticated
WITH CHECK (
  public.is_moderator_or_admin(auth.uid())
);

-- RLS: UPDATE only for moderators/admins
CREATE POLICY "Moderators and admins can update modules"
ON public.course_modules FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()))
WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- RLS: DELETE only for admins
CREATE POLICY "Only admins can delete modules"
ON public.course_modules FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COURSE LESSONS TABLE
-- =============================================
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  position int NOT NULL CHECK (position >= 1),
  access_level text NOT NULL CHECK (access_level IN ('basic', 'premium')),
  content_type text NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'audio', 'text')),
  media_url text,
  duration_seconds int CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  body_markdown text,
  is_published boolean NOT NULL DEFAULT true,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_lessons_module_position_unique UNIQUE (module_id, position)
);

-- Enable RLS
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT only published lessons from published modules and courses
CREATE POLICY "Users can view published lessons"
ON public.course_lessons FOR SELECT
TO authenticated
USING (
  is_published = true 
  AND EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = course_lessons.module_id 
    AND m.is_published = true
    AND c.is_published = true
  )
);

-- RLS: INSERT only for moderators/admins
CREATE POLICY "Moderators and admins can insert lessons"
ON public.course_lessons FOR INSERT
TO authenticated
WITH CHECK (
  public.is_moderator_or_admin(auth.uid())
);

-- RLS: UPDATE only for moderators/admins
CREATE POLICY "Moderators and admins can update lessons"
ON public.course_lessons FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()))
WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- RLS: DELETE only for admins
CREATE POLICY "Only admins can delete lessons"
ON public.course_lessons FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_course_lessons_updated_at
BEFORE UPDATE ON public.course_lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- LESSON PROGRESS TABLE (MANDATORY)
-- =============================================
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress_percent int NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position_seconds int NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_progress_lesson_user_unique UNIQUE (lesson_id, user_id)
);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT only own progress
CREATE POLICY "Users can view own progress"
ON public.lesson_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: INSERT only own progress
CREATE POLICY "Users can insert own progress"
ON public.lesson_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS: UPDATE only own progress
CREATE POLICY "Users can update own progress"
ON public.lesson_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS: DELETE disabled for users (only admin can delete)
CREATE POLICY "Only admins can delete progress"
ON public.lesson_progress FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VALIDATION TRIGGER: media_url required for video/audio
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_lesson_content()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_lesson_content_trigger
BEFORE INSERT OR UPDATE ON public.course_lessons
FOR EACH ROW
EXECUTE FUNCTION public.validate_lesson_content();

-- =============================================
-- VALIDATION TRIGGER: completed_at required when progress=100
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_lesson_progress()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_lesson_progress_trigger
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.validate_lesson_progress();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX idx_course_lessons_module_id ON public.course_lessons(module_id);
CREATE INDEX idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);