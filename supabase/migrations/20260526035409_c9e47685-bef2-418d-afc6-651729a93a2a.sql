
-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS study_windows JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT false;

-- Documents (Resume Vault file uploads)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'resume',
  version INTEGER NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  target_role TEXT,
  target_company TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents all" ON public.documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Placement events
CREATE TABLE IF NOT EXISTS public.placement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  company TEXT,
  event_type TEXT NOT NULL DEFAULT 'Other',
  event_date DATE NOT NULL,
  event_time TIME,
  registration_deadline DATE,
  registration_url TEXT,
  notes TEXT,
  reminder_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own placement_events all" ON public.placement_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_placement_events_updated BEFORE UPDATE ON public.placement_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Level rewards
CREATE TABLE IF NOT EXISTS public.level_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_reached INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'level_up',
  elite_until TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own level_rewards all" ON public.level_rewards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Distraction logs
CREATE TABLE IF NOT EXISTS public.distraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT
);
ALTER TABLE public.distraction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own distraction_logs all" ON public.distraction_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Custom tracks
CREATE TABLE IF NOT EXISTS public.custom_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Code',
  color TEXT NOT NULL DEFAULT 'purple',
  skill_level TEXT NOT NULL DEFAULT 'Beginner',
  target_type TEXT,
  why_this_track TEXT,
  completion_pct INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom_tracks all" ON public.custom_tracks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_custom_tracks_updated BEFORE UPDATE ON public.custom_tracks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.custom_track_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.custom_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_name TEXT NOT NULL DEFAULT 'General',
  topic_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started',
  notes TEXT,
  resource_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_track_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom_track_topics all" ON public.custom_track_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.custom_track_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.custom_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  my_answer TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_track_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom_track_questions all" ON public.custom_track_questions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Arena questions (shared bank)
CREATE TABLE IF NOT EXISTS public.arena_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arena_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arena questions read all" ON public.arena_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.daily_puzzle_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_id UUID REFERENCES public.arena_questions(id) ON DELETE SET NULL,
  puzzle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  correct BOOLEAN,
  time_taken_sec INTEGER,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_puzzle_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_puzzle_attempts all" ON public.daily_puzzle_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  challenger_id UUID NOT NULL,
  opponent_id UUID,
  topic TEXT,
  difficulty TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  questions JSONB,
  challenger_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  opponent_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duels participant read" ON public.duels FOR SELECT TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id OR opponent_id IS NULL);
CREATE POLICY "duels challenger insert" ON public.duels FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "duels participant update" ON public.duels FOR UPDATE TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE TABLE IF NOT EXISTS public.arena_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  duel_wins INTEGER NOT NULL DEFAULT 0,
  puzzle_score INTEGER NOT NULL DEFAULT 0,
  math_sprint_best INTEGER NOT NULL DEFAULT 0,
  memory_best INTEGER NOT NULL DEFAULT 0,
  total_arena_xp INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start)
);
ALTER TABLE public.arena_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arena_leaderboard read all" ON public.arena_leaderboard FOR SELECT TO authenticated USING (true);
CREATE POLICY "arena_leaderboard own write" ON public.arena_leaderboard FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  consistency_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  dsa_count INTEGER NOT NULL DEFAULT 0,
  apps_count INTEGER NOT NULL DEFAULT 0,
  focus_sessions INTEGER NOT NULL DEFAULT 0,
  mock_tests INTEGER NOT NULL DEFAULT 0,
  tracker_completion_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  opt_in BOOLEAN NOT NULL DEFAULT false,
  college_name TEXT,
  UNIQUE(user_id, week_start)
);
ALTER TABLE public.study_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_leaderboard opted read" ON public.study_leaderboard FOR SELECT TO authenticated USING (opt_in = true OR auth.uid() = user_id);
CREATE POLICY "study_leaderboard own write" ON public.study_leaderboard FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT,
  event_type TEXT,
  event_name TEXT NOT NULL,
  typical_month INTEGER,
  typical_window TEXT,
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_events read all" ON public.system_events FOR SELECT TO authenticated USING (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "documents own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "documents own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "documents own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "documents own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
