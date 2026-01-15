-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('regular', 'aparte')),
  description_short TEXT,
  cover_image_url TEXT,
  route_slug TEXT NOT NULL UNIQUE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('premium', 'paid_aparte')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS for courses: SELECT only published courses for authenticated users
CREATE POLICY "Users can view published courses"
ON public.courses
FOR SELECT
TO authenticated
USING (is_published = true);

-- RLS for courses: INSERT only for moderator/admin
CREATE POLICY "Moderators and admins can insert courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- RLS for courses: UPDATE only for moderator/admin
CREATE POLICY "Moderators and admins can update courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()))
WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- RLS for courses: DELETE only for admin
CREATE POLICY "Admins can delete courses"
ON public.courses
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS for course_enrollments: SELECT own enrollments only
CREATE POLICY "Users can view their own enrollments"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS for course_enrollments: Block all user writes (server-only via service role)
CREATE POLICY "No direct user inserts on enrollments"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct user updates on enrollments"
ON public.course_enrollments
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct user deletes on enrollments"
ON public.course_enrollments
FOR DELETE
TO authenticated
USING (false);

-- Create trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();