
-- DSA problems
CREATE TABLE public.dsa_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  url text,
  platform text,
  topic text,
  difficulty text CHECK (difficulty IN ('Easy','Medium','Hard')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','attempted','solved','revise')),
  attempts integer NOT NULL DEFAULT 0,
  last_revised_at date,
  starred boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dsa_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dsa all" ON public.dsa_problems FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER dsa_touch BEFORE UPDATE ON public.dsa_problems FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_dsa_user ON public.dsa_problems(user_id);

-- Jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  location text,
  job_type text CHECK (job_type IN ('Internship','Full-time','PPO','Contract')),
  source text,
  link text,
  status text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','applied','oa','interview','offer','rejected','accepted')),
  applied_at date,
  deadline date,
  salary text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs all" ON public.jobs FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_jobs_user ON public.jobs(user_id);

-- Companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  role_focus text,
  status text NOT NULL DEFAULT 'researching' CHECK (status IN ('researching','prepping','applied','interviewing','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  ctc text,
  location text,
  last_contact date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companies all" ON public.companies FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_companies_user ON public.companies(user_id);

-- Resources
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  url text,
  resource_type text CHECK (resource_type IN ('Article','Video','Course','Book','Repo','Cheatsheet','Other')),
  topic text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','reading','done','archived')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resources all" ON public.resources FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER resources_touch BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_resources_user ON public.resources(user_id);
