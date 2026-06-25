-- =========================================================
-- ARENA REBUILD — PHASE 1
-- =========================================================

-- ---------- arena_matches ----------
CREATE TABLE public.arena_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  max_players INTEGER NOT NULL,
  current_players INTEGER NOT NULL DEFAULT 0,
  zone TEXT,
  topic TEXT NOT NULL DEFAULT 'mixed',
  difficulty TEXT NOT NULL DEFAULT 'mixed',
  question_count INTEGER NOT NULL DEFAULT 10,
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  invite_code TEXT UNIQUE,
  xp_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_arena_matches_status ON public.arena_matches(status);
CREATE INDEX idx_arena_matches_type ON public.arena_matches(match_type);
CREATE INDEX idx_arena_matches_created ON public.arena_matches(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_matches TO authenticated;
GRANT ALL ON public.arena_matches TO service_role;

ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches readable by authenticated"
  ON public.arena_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create matches"
  ON public.arena_matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "Creator can update own match"
  ON public.arena_matches FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- ---------- match_players ----------
CREATE TABLE public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  arena_rank TEXT NOT NULL DEFAULT 'Recruit',
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  avg_response_ms INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  rank_in_match INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  eliminated BOOLEAN NOT NULL DEFAULT false,
  eliminated_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_answer_at TIMESTAMPTZ,
  UNIQUE (match_id, user_id)
);
CREATE INDEX idx_match_players_match ON public.match_players(match_id, score DESC);
CREATE INDEX idx_match_players_user ON public.match_players(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_players TO authenticated;
GRANT ALL ON public.match_players TO service_role;

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match players readable by authenticated"
  ON public.match_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Players insert own row"
  ON public.match_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players update own row"
  ON public.match_players FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- match_answers ----------
CREATE TABLE public.match_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.arena_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_id UUID REFERENCES public.arena_questions(id) ON DELETE SET NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_ms INTEGER NOT NULL,
  score_delta INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id, question_index)
);
CREATE INDEX idx_match_answers_match ON public.match_answers(match_id, user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_answers TO authenticated;
GRANT ALL ON public.match_answers TO service_role;

ALTER TABLE public.match_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own match answers only"
  ON public.match_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- arena_profiles ----------
CREATE TABLE public.arena_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  arena_rank TEXT NOT NULL DEFAULT 'Recruit',
  arena_xp INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  longest_win_streak INTEGER NOT NULL DEFAULT 0,
  zone TEXT,
  season_xp INTEGER NOT NULL DEFAULT 0,
  season_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_profiles TO authenticated;
GRANT ALL ON public.arena_profiles TO service_role;

ALTER TABLE public.arena_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arena profiles public read"
  ON public.arena_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own arena profile write"
  ON public.arena_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER arena_profiles_touch
  BEFORE UPDATE ON public.arena_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- arena_seasons ----------
CREATE TABLE public.arena_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.arena_seasons TO authenticated;
GRANT ALL ON public.arena_seasons TO service_role;

ALTER TABLE public.arena_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons readable by authenticated"
  ON public.arena_seasons FOR SELECT TO authenticated USING (true);

INSERT INTO public.arena_seasons (season_number, name, starts_at, ends_at, is_active)
VALUES (1, 'Season 1: Genesis', now(), now() + INTERVAL '90 days', true);

-- ---------- arena_questions extensions ----------
ALTER TABLE public.arena_questions
  ADD COLUMN IF NOT EXISTS battle_eligible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avg_response_ms INTEGER NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS correct_rate NUMERIC(5,2) NOT NULL DEFAULT 0.5;

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_answers;