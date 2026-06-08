
CREATE TABLE public.task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'standalone',
  project_id uuid,
  name text NOT NULL DEFAULT 'Untitled',
  icon text NOT NULL DEFAULT '🎯',
  view_type text NOT NULL DEFAULT 'table',
  properties jsonb NOT NULL DEFAULT '[]'::jsonb,
  statuses jsonb NOT NULL DEFAULT '[{"id":"planning","name":"Planning","color":"violet"},{"id":"in_progress","name":"In progress","color":"blue"},{"id":"done","name":"Done","color":"green"}]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_boards TO authenticated;
GRANT ALL ON public.task_boards TO service_role;
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_task_boards ON public.task_boards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  emoji text,
  status_id text NOT NULL DEFAULT 'planning',
  due_date date,
  assignee text,
  progress int NOT NULL DEFAULT 0,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_tasks_board_idx ON public.tm_tasks(board_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tm_tasks TO authenticated;
GRANT ALL ON public.tm_tasks TO service_role;
ALTER TABLE public.tm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_tm_tasks ON public.tm_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tm_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tm_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'text',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_blocks_task_idx ON public.tm_blocks(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tm_blocks TO authenticated;
GRANT ALL ON public.tm_blocks TO service_role;
ALTER TABLE public.tm_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_tm_blocks ON public.tm_blocks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tm_boards_touch BEFORE UPDATE ON public.task_boards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tm_tasks_touch BEFORE UPDATE ON public.tm_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tm_blocks_touch BEFORE UPDATE ON public.tm_blocks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
