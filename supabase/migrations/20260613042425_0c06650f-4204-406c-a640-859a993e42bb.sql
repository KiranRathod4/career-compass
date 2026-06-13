
-- =========================================================
-- ARENA BATTLES
-- =========================================================
CREATE TABLE public.arena_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_type TEXT NOT NULL CHECK (battle_type IN ('city_sprint','zone_war','blitz','squad','duel')),
  title TEXT NOT NULL,
  zone TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed','cancelled')),
  max_participants INTEGER NOT NULL DEFAULT 50,
  question_count INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_battles TO authenticated;
GRANT ALL ON public.arena_battles TO service_role;

ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view battles"
  ON public.arena_battles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can create battles"
  ON public.arena_battles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update battles"
  ON public.arena_battles FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete battles"
  ON public.arena_battles FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

CREATE INDEX idx_arena_battles_status_starts ON public.arena_battles(status, starts_at DESC);
CREATE INDEX idx_arena_battles_zone ON public.arena_battles(zone, starts_at DESC);

CREATE TRIGGER trg_arena_battles_updated_at
  BEFORE UPDATE ON public.arena_battles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- BATTLE PARTICIPANTS
-- =========================================================
CREATE TABLE public.battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.arena_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  rank INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_participants TO authenticated;
GRANT ALL ON public.battle_participants TO service_role;

ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;

-- Public to authenticated so live leaderboards work
CREATE POLICY "Authenticated can view participants"
  ON public.battle_participants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users insert their own participation"
  ON public.battle_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own participation"
  ON public.battle_participants FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own participation"
  ON public.battle_participants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_battle_participants_battle_score
  ON public.battle_participants(battle_id, score DESC);
CREATE INDEX idx_battle_participants_user
  ON public.battle_participants(user_id);

CREATE TRIGGER trg_battle_participants_updated_at
  BEFORE UPDATE ON public.battle_participants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- ZONE RANKINGS
-- =========================================================
CREATE TABLE public.zone_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  week_start DATE NOT NULL,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  city_rank INTEGER,
  zone_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zone_rankings TO authenticated;
GRANT ALL ON public.zone_rankings TO service_role;

ALTER TABLE public.zone_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zone rankings"
  ON public.zone_rankings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users insert their own ranking row"
  ON public.zone_rankings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own ranking row"
  ON public.zone_rankings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_zone_rankings_zone_week_xp
  ON public.zone_rankings(zone, week_start, weekly_xp DESC);

CREATE TRIGGER trg_zone_rankings_updated_at
  BEFORE UPDATE ON public.zone_rankings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- PROFILES: add zone + city
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- =========================================================
-- REALTIME: enable for live leaderboards
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_battles;
