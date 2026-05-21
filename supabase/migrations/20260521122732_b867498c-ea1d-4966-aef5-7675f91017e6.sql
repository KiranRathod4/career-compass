
CREATE TABLE public.aptitude_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  topic text,
  questions_attempted int NOT NULL DEFAULT 0,
  questions_correct int NOT NULL DEFAULT 0,
  time_minutes int NOT NULL DEFAULT 0,
  difficulty text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aptitude_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own aptitude all" ON public.aptitude_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_aptitude_touch BEFORE UPDATE ON public.aptitude_log FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sql_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  platform text,
  url text,
  difficulty text,
  topic text,
  status text NOT NULL DEFAULT 'todo',
  attempts int NOT NULL DEFAULT 0,
  last_revised_at date,
  notes text,
  starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sql_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sql all" ON public.sql_problems FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_sql_touch BEFORE UPDATE ON public.sql_problems FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.devops_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  tool text,
  category text,
  status text NOT NULL DEFAULT 'todo',
  hours numeric NOT NULL DEFAULT 0,
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.devops_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devops all" ON public.devops_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_devops_touch BEFORE UPDATE ON public.devops_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.qa_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  test_type text NOT NULL DEFAULT 'manual',
  tool text,
  category text,
  status text NOT NULL DEFAULT 'todo',
  hours numeric NOT NULL DEFAULT 0,
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own qa all" ON public.qa_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_qa_touch BEFORE UPDATE ON public.qa_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'technical',
  current_level int NOT NULL DEFAULT 1,
  target_level int NOT NULL DEFAULT 5,
  priority text NOT NULL DEFAULT 'medium',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skills all" ON public.skills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_skills_touch BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
