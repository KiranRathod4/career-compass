
CREATE OR REPLACE FUNCTION public.arena_create_match(
  p_match_type text,
  p_max_players integer DEFAULT 4,
  p_topic text DEFAULT 'mixed',
  p_difficulty text DEFAULT 'mixed',
  p_question_count integer DEFAULT 10,
  p_duration_seconds integer DEFAULT 300
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match_id uuid;
  v_username text;
  v_rank text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT username, arena_rank INTO v_username, v_rank FROM public.arena_profiles WHERE user_id = v_uid;
  IF v_username IS NULL THEN
    v_username := COALESCE((SELECT split_part(email,'@',1) FROM auth.users WHERE id = v_uid), 'Player');
    v_rank := 'Recruit';
    INSERT INTO public.arena_profiles(user_id, username, arena_rank) VALUES (v_uid, v_username, v_rank)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  INSERT INTO public.arena_matches(match_type,status,max_players,current_players,topic,difficulty,question_count,duration_seconds,created_by)
  VALUES (p_match_type,'waiting',GREATEST(2,p_max_players),1,p_topic,p_difficulty,p_question_count,p_duration_seconds,v_uid)
  RETURNING id INTO v_match_id;
  INSERT INTO public.match_players(match_id,user_id,username,arena_rank)
  VALUES (v_match_id, v_uid, v_username, COALESCE(v_rank,'Recruit'));
  RETURN v_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.arena_join_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.arena_matches;
  v_username text;
  v_rank text;
  v_count int;
  v_new_status text;
  v_started timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_match FROM public.arena_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status NOT IN ('waiting','countdown') THEN RAISE EXCEPTION 'Match no longer joinable'; END IF;
  IF EXISTS(SELECT 1 FROM public.match_players WHERE match_id = p_match_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('match_id', p_match_id, 'status', v_match.status, 'already_joined', true);
  END IF;
  IF v_match.current_players >= v_match.max_players THEN RAISE EXCEPTION 'Match is full'; END IF;
  SELECT username, arena_rank INTO v_username, v_rank FROM public.arena_profiles WHERE user_id = v_uid;
  IF v_username IS NULL THEN
    v_username := COALESCE((SELECT split_part(email,'@',1) FROM auth.users WHERE id = v_uid), 'Player');
    v_rank := 'Recruit';
    INSERT INTO public.arena_profiles(user_id, username, arena_rank) VALUES (v_uid, v_username, v_rank)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  INSERT INTO public.match_players(match_id,user_id,username,arena_rank)
  VALUES (p_match_id, v_uid, v_username, COALESCE(v_rank,'Recruit'));
  v_count := v_match.current_players + 1;
  v_new_status := v_match.status;
  v_started := v_match.started_at;
  IF v_count >= v_match.max_players AND v_match.status = 'waiting' THEN
    v_new_status := 'countdown';
    v_started := now() + interval '10 seconds';
  END IF;
  UPDATE public.arena_matches SET current_players = v_count, status = v_new_status, started_at = v_started WHERE id = p_match_id;
  RETURN jsonb_build_object('match_id', p_match_id, 'status', v_new_status, 'current_players', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.arena_create_match(text,integer,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arena_join_match(uuid) TO authenticated;
