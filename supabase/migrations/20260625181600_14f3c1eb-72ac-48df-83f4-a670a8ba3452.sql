
CREATE OR REPLACE FUNCTION public.arena_start_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.arena_matches;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_match FROM public.arena_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;

  -- only members can trigger the flip
  IF NOT EXISTS (SELECT 1 FROM public.match_players WHERE match_id = p_match_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF v_match.status = 'active' THEN
    RETURN jsonb_build_object('match_id', p_match_id, 'status', 'active', 'already_started', true);
  END IF;

  IF v_match.status <> 'countdown' THEN
    RAISE EXCEPTION 'Match not in countdown';
  END IF;

  IF v_match.started_at IS NULL OR v_match.started_at > now() THEN
    RAISE EXCEPTION 'Countdown not finished';
  END IF;

  UPDATE public.arena_matches
     SET status = 'active',
         started_at = COALESCE(v_match.started_at, now()),
         current_question_index = 0
   WHERE id = p_match_id;

  RETURN jsonb_build_object('match_id', p_match_id, 'status', 'active');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.arena_start_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_start_match(uuid) TO authenticated;
