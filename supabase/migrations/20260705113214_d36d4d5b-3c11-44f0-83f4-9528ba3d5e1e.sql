
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS is_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

-- Toggle ready state for the calling user in a given match.
CREATE OR REPLACE FUNCTION public.arena_toggle_ready(p_match_id uuid, p_ready boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.arena_matches;
  v_present int;
  v_ready int;
  v_new_status text := NULL;
  v_started timestamptz := NULL;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_match FROM public.arena_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status NOT IN ('waiting') THEN
    RAISE EXCEPTION 'Cannot change ready state once match has started';
  END IF;

  UPDATE public.match_players
     SET is_ready = COALESCE(p_ready, false),
         ready_at = CASE WHEN COALESCE(p_ready,false) THEN now() ELSE NULL END
   WHERE match_id = p_match_id AND user_id = v_uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not a participant'; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_ready)
    INTO v_present, v_ready
    FROM public.match_players
   WHERE match_id = p_match_id;

  -- Start countdown when >=2 players present AND everyone is ready.
  IF v_present >= 2 AND v_ready = v_present AND v_match.status = 'waiting' THEN
    v_new_status := 'countdown';
    v_started := now() + interval '5 seconds';
    UPDATE public.arena_matches
       SET status = v_new_status, started_at = v_started
     WHERE id = p_match_id;
    -- Clear ready flags now that countdown has begun.
    UPDATE public.match_players SET is_ready = false, ready_at = NULL WHERE match_id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'match_id', p_match_id,
    'is_ready', COALESCE(p_ready,false),
    'present', v_present,
    'ready', v_ready,
    'status', COALESCE(v_new_status, v_match.status)
  );
END;
$$;

-- Recreate arena_join_match so joining resets ready flag and full-room path still works.
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
  INSERT INTO public.match_players(match_id,user_id,username,arena_rank,is_ready)
  VALUES (p_match_id, v_uid, v_username, COALESCE(v_rank,'Recruit'), false);
  v_count := v_match.current_players + 1;
  v_new_status := v_match.status;
  v_started := v_match.started_at;
  IF v_count >= v_match.max_players AND v_match.status = 'waiting' THEN
    v_new_status := 'countdown';
    v_started := now() + interval '5 seconds';
    UPDATE public.match_players SET is_ready = false, ready_at = NULL WHERE match_id = p_match_id;
  END IF;
  UPDATE public.arena_matches SET current_players = v_count, status = v_new_status, started_at = v_started WHERE id = p_match_id;
  RETURN jsonb_build_object('match_id', p_match_id, 'status', v_new_status, 'current_players', v_count);
END;
$$;
