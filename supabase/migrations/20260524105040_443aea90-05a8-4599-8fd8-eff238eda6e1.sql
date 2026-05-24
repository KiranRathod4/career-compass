
CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  wins TEXT,
  blockers TEXT,
  lessons TEXT,
  next_focus TEXT,
  energy_rating INTEGER NOT NULL DEFAULT 5,
  productivity_rating INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly_reviews all" ON public.weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_weekly_reviews_updated BEFORE UPDATE ON public.weekly_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goals TEXT,
  outcomes TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  focus_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sprints all" ON public.sprints FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_sprints_updated BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
