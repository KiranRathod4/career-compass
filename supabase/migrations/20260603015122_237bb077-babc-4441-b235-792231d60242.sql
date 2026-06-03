
CREATE INDEX IF NOT EXISTS idx_dsa_problems_user_status ON public.dsa_problems(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sql_problems_user_status ON public.sql_problems(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON public.focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_aptitude_log_user_date ON public.aptitude_log(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tracker_user_date ON public.daily_tracker(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created ON public.ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_created ON public.ai_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pod_messages_pod_created ON public.pod_messages(pod_code, created_at);
CREATE INDEX IF NOT EXISTS idx_interview_prep_user ON public.interview_prep(user_id, category);
CREATE INDEX IF NOT EXISTS idx_companies_user_status ON public.companies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_user_status ON public.contacts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON public.time_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_level_rewards_user_active ON public.level_rewards(user_id, active, elite_until DESC);
