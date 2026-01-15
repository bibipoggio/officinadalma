-- ===============================
-- ENUM TYPES
-- ===============================
CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE public.share_mode AS ENUM ('private', 'community', 'anonymous');
CREATE TYPE public.subscription_provider AS ENUM ('mercado_pago');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

-- ===============================
-- PROFILES TABLE
-- ===============================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Profiles RLS: Users can update their own display_name
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles RLS: Allow insert for new users (triggered on signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ===============================
-- USER ROLES TABLE (separate for security)
-- ===============================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles RLS: Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ===============================
-- SECURITY DEFINER FUNCTION TO CHECK ROLES
-- ===============================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if user is moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('moderator', 'admin')
  )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- ===============================
-- TRIGGER TO CREATE PROFILE ON SIGNUP
-- ===============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===============================
-- DAILY CONTENT TABLE
-- ===============================
CREATE TABLE public.daily_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  tonica_title TEXT NOT NULL,
  tonica_short TEXT NOT NULL,
  tonica_full TEXT NOT NULL,
  tonica_practice TEXT NOT NULL,
  meditation_audio_url TEXT,
  meditation_duration_seconds INTEGER CHECK (meditation_duration_seconds IS NULL OR meditation_duration_seconds >= 0),
  spotify_episode_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_content ENABLE ROW LEVEL SECURITY;

-- Daily content RLS: Authenticated users can read published content
CREATE POLICY "Authenticated users can read published daily content"
  ON public.daily_content FOR SELECT
  TO authenticated
  USING (published = true OR public.is_moderator_or_admin(auth.uid()));

-- Daily content RLS: Moderators and admins can insert
CREATE POLICY "Moderators and admins can insert daily content"
  ON public.daily_content FOR INSERT
  TO authenticated
  WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- Daily content RLS: Moderators and admins can update
CREATE POLICY "Moderators and admins can update daily content"
  ON public.daily_content FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin(auth.uid()))
  WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- Daily content RLS: Only admins can delete (soft-delete preferred via published=false)
CREATE POLICY "Only admins can delete daily content"
  ON public.daily_content FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===============================
-- CHECKINS TABLE
-- ===============================
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  energy INTEGER NOT NULL CHECK (energy >= 0 AND energy <= 10),
  feeling_text TEXT NOT NULL CHECK (char_length(feeling_text) <= 500),
  share_mode share_mode NOT NULL DEFAULT 'private',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Checkins RLS: Users can insert their own checkins
CREATE POLICY "Users can insert own checkins"
  ON public.checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Checkins RLS: Users can read their own checkins OR published community/anonymous
CREATE POLICY "Users can read checkins"
  ON public.checkins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (published = true AND share_mode IN ('community', 'anonymous'))
  );

-- Checkins RLS: Users can update their own checkins (share_mode, published, etc.)
CREATE POLICY "Users can update own checkins"
  ON public.checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Checkins RLS: Only admins can delete (users should unpublish instead)
CREATE POLICY "Only admins can delete checkins"
  ON public.checkins FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===============================
-- CHECKIN REACTIONS TABLE
-- ===============================
CREATE TABLE public.checkin_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES public.checkins(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (checkin_id, user_id, emoji)
);

ALTER TABLE public.checkin_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions RLS: Authenticated users can read reactions for visible checkins
CREATE POLICY "Users can read reactions"
  ON public.checkin_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checkins c
      WHERE c.id = checkin_id
      AND (c.user_id = auth.uid() OR (c.published = true AND c.share_mode IN ('community', 'anonymous')))
    )
  );

-- Reactions RLS: Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
  ON public.checkin_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Reactions RLS: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON public.checkin_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ===============================
-- REPORTS TABLE (DENÚNCIAS)
-- ===============================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_id UUID REFERENCES public.checkins(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reports RLS: Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

-- Reports RLS: Only moderators and admins can view reports
CREATE POLICY "Moderators and admins can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin(auth.uid()));

-- Reports RLS: Only moderators and admins can update reports
CREATE POLICY "Moderators and admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin(auth.uid()))
  WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- ===============================
-- SUBSCRIPTIONS TABLE
-- ===============================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider subscription_provider NOT NULL DEFAULT 'mercado_pago',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS: Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions: NO client insert/update/delete - only via edge functions/admin
-- (Policies intentionally omitted for write operations)

-- ===============================
-- UPDATED_AT TRIGGER FUNCTION
-- ===============================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_daily_content_updated_at
  BEFORE UPDATE ON public.daily_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================
-- INDEXES FOR PERFORMANCE
-- ===============================
CREATE INDEX idx_daily_content_date ON public.daily_content(date);
CREATE INDEX idx_checkins_user_date ON public.checkins(user_id, date);
CREATE INDEX idx_checkins_date_published ON public.checkins(date, published) WHERE share_mode IN ('community', 'anonymous');
CREATE INDEX idx_checkin_reactions_checkin ON public.checkin_reactions(checkin_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);