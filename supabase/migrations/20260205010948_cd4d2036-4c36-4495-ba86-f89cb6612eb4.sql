-- Create scheduled_events table for recurring event reminders
CREATE TABLE public.scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  event_time TIME NOT NULL,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view active events
CREATE POLICY "Users can view active events"
ON public.scheduled_events
FOR SELECT
USING (is_active = true OR is_moderator_or_admin(auth.uid()));

-- Only moderators/admins can insert
CREATE POLICY "Moderators can insert events"
ON public.scheduled_events
FOR INSERT
WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Only moderators/admins can update
CREATE POLICY "Moderators can update events"
ON public.scheduled_events
FOR UPDATE
USING (is_moderator_or_admin(auth.uid()))
WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins can delete events"
ON public.scheduled_events
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_events_updated_at
BEFORE UPDATE ON public.scheduled_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();