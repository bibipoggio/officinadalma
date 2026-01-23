-- Create lesson_comments table for questions and comments
CREATE TABLE public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_parent_id ON public.lesson_comments(parent_id);

-- Enable RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read comments
CREATE POLICY "Users can read all comments"
ON public.lesson_comments
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can create their own comments
CREATE POLICY "Users can create comments"
ON public.lesson_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.lesson_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Moderators/admins can update any comment (for moderation)
CREATE POLICY "Moderators can update comments"
ON public.lesson_comments
FOR UPDATE
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- Policy: Moderators/admins can delete any comment
CREATE POLICY "Moderators can delete comments"
ON public.lesson_comments
FOR DELETE
TO authenticated
USING (is_moderator_or_admin(auth.uid()));

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.lesson_comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_lesson_comments_updated_at
BEFORE UPDATE ON public.lesson_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();