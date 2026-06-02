CREATE TABLE public.pod_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_code text NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Member',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_pod_messages_code_created ON public.pod_messages(pod_code, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.pod_messages TO authenticated;
GRANT ALL ON public.pod_messages TO service_role;

ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authed user reads pod messages"
ON public.pod_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authed users post as themselves"
ON public.pod_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND length(content) BETWEEN 1 AND 2000);

CREATE POLICY "Users delete own pod messages"
ON public.pod_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pod_messages;