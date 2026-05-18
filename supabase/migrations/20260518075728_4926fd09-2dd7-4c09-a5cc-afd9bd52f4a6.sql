
-- Profiles table (user setup)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  college_name TEXT,
  graduation_year INT,
  target_domains TEXT[] DEFAULT '{}',
  placement_start_date DATE,
  daily_dsa_target INT DEFAULT 5,
  daily_application_target INT DEFAULT 2,
  daily_deep_work_target NUMERIC DEFAULT 6,
  linkedin_url TEXT,
  github_url TEXT,
  quick_links JSONB DEFAULT '[]'::jsonb,
  notification_prefs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily tracker
CREATE TABLE public.daily_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  wake_time TIME,
  sleep_time TIME,
  deep_work_hours NUMERIC DEFAULT 0,
  dsa_done BOOLEAN DEFAULT FALSE,
  aptitude_done BOOLEAN DEFAULT FALSE,
  sql_done BOOLEAN DEFAULT FALSE,
  devops_done BOOLEAN DEFAULT FALSE,
  qa_done BOOLEAN DEFAULT FALSE,
  mock_done BOOLEAN DEFAULT FALSE,
  applications_count INT DEFAULT 0,
  revision_done BOOLEAN DEFAULT FALSE,
  linkedin_post BOOLEAN DEFAULT FALSE,
  mood TEXT,
  productivity_score INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily all" ON public.daily_tracker FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Time blocks (daily planner)
CREATE TABLE public.time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  task TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks all" ON public.time_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Focus sessions
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INT NOT NULL,
  mode TEXT NOT NULL,
  task TEXT,
  category TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions all" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_daily BEFORE UPDATE ON public.daily_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
