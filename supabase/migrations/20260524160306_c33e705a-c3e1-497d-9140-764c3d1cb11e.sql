-- Taiyaar gamification foundation tables

-- XP transactions (source of truth for total XP & level)
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_xp_user ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_created ON public.xp_transactions(created_at);
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp all" ON public.xp_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User badges (badge_id is a code-defined string)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges all" ON public.user_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  daily_current INTEGER NOT NULL DEFAULT 0,
  daily_longest INTEGER NOT NULL DEFAULT 0,
  daily_last_date DATE,
  dsa_current INTEGER NOT NULL DEFAULT 0,
  dsa_longest INTEGER NOT NULL DEFAULT 0,
  dsa_last_date DATE,
  apply_current INTEGER NOT NULL DEFAULT 0,
  apply_longest INTEGER NOT NULL DEFAULT 0,
  apply_last_date DATE,
  freeze_used_this_month INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streaks all" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly challenges (global pool)
CREATE TABLE public.weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  category TEXT,
  week_start_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
-- Readable by all authenticated users (shared pool); only DB admin inserts
CREATE POLICY "challenges read all" ON public.weekly_challenges FOR SELECT TO authenticated USING (true);

-- Per-user challenge progress
CREATE TABLE public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenge progress all" ON public.user_challenge_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscriptions (Razorpay)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  razorpay_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription all" ON public.subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: total XP
CREATE OR REPLACE FUNCTION public.get_user_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(xp_amount), 0)::INTEGER FROM public.xp_transactions WHERE user_id = p_user_id;
$$;

-- Helper: level info from XP
CREATE OR REPLACE FUNCTION public.get_user_level(p_xp INTEGER)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_level INTEGER; v_name TEXT; v_next INTEGER; v_prev INTEGER;
BEGIN
  IF p_xp < 500 THEN v_level := 1; v_name := 'Fresher'; v_prev := 0; v_next := 500;
  ELSIF p_xp < 1500 THEN v_level := 2; v_name := 'Contender'; v_prev := 500; v_next := 1500;
  ELSIF p_xp < 3000 THEN v_level := 3; v_name := 'Candidate'; v_prev := 1500; v_next := 3000;
  ELSIF p_xp < 6000 THEN v_level := 4; v_name := 'Interview Ready'; v_prev := 3000; v_next := 6000;
  ELSIF p_xp < 10000 THEN v_level := 5; v_name := 'Offer Hunter'; v_prev := 6000; v_next := 10000;
  ELSE v_level := 6; v_name := 'Placed'; v_prev := 10000; v_next := p_xp;
  END IF;
  RETURN jsonb_build_object(
    'level', v_level, 'name', v_name, 'xp', p_xp,
    'prev_threshold', v_prev, 'next_threshold', v_next,
    'progress_pct', CASE WHEN v_next = v_prev THEN 100 ELSE ROUND(((p_xp - v_prev)::NUMERIC / (v_next - v_prev)) * 100) END
  );
END;
$$;

-- Touch trigger for subscriptions
CREATE TRIGGER touch_subscriptions BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_streaks BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();