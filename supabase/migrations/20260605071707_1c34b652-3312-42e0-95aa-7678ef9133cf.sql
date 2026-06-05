-- 1. Add updated_at to custom_track_topics + trigger
ALTER TABLE public.custom_track_topics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_updated_at_custom_track_topics ON public.custom_track_topics;
CREATE TRIGGER set_updated_at_custom_track_topics
BEFORE UPDATE ON public.custom_track_topics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Normalize status values and add CHECK constraint
UPDATE public.custom_track_topics SET status = 'Not Started' WHERE status IS NULL OR status NOT IN ('Not Started','In Progress','Completed');
UPDATE public.custom_track_topics SET status = 'Completed' WHERE completed = true AND status <> 'Completed';

ALTER TABLE public.custom_track_topics DROP CONSTRAINT IF EXISTS custom_track_topics_status_check;
ALTER TABLE public.custom_track_topics ADD CONSTRAINT custom_track_topics_status_check CHECK (status IN ('Not Started','In Progress','Completed'));

-- 3. notes_content on custom_tracks
ALTER TABLE public.custom_tracks ADD COLUMN IF NOT EXISTS notes_content TEXT;
ALTER TABLE public.custom_tracks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.custom_tracks ADD COLUMN IF NOT EXISTS target_role TEXT;

-- 4. resources track_id
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.custom_tracks(id) ON DELETE SET NULL;

-- 5. Sidebar customization on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_prepare_items JSONB NOT NULL DEFAULT '["dsa","aptitude","sql","devops","qa","custom_tracks"]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_section_order JSONB NOT NULL DEFAULT '["overview","prepare","career","grow","insights","rewards"]'::jsonb;