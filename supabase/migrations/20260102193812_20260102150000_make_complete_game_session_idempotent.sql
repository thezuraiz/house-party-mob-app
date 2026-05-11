/*
  # Make complete_game_session Idempotent

  ## Problem
  The `complete_game_session` function currently fails with "Session not found or not active"
  when called multiple times (e.g., due to double-tap, network retry, or race conditions).
  This causes distance/weight games to fail completion.

  ## Solution
  Update the function to:
  1. Check session status without requiring 'active' status
  2. Return success immediately if already completed (idempotent behavior)
  3. Only error if session is in an invalid state

  ## Changes
  - Add v_status variable to store current session status
  - If status = 'completed', return success with already_completed flag
  - If status != 'active', return appropriate error
  - Otherwise, proceed with completion as normal
*/

CREATE OR REPLACE FUNCTION complete_game_session(
  p_session_id uuid,
  p_players jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player jsonb;
  v_updated_count int := 0;
  v_game_id uuid;
  v_house_id uuid;
  v_status text;
BEGIN
  -- Verify session exists and get its current status
  SELECT game_id, house_id, status INTO v_game_id, v_house_id, v_status
  FROM game_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- IDEMPOTENT: If already completed, return success immediately
  IF v_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'session_id', p_session_id,
      'already_completed', true,
      'players_updated', 0,
      'message', 'Session was already completed'
    );
  END IF;

  -- If not active, cannot complete
  IF v_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session is not active (current status: ' || v_status || ')'
    );
  END IF;

  -- Verify caller is authorized (member of house or invited)
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = v_house_id
      AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM game_invitations
    WHERE game_id = v_game_id
      AND invitee_id = auth.uid()
      AND status = 'accepted'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to complete this game'
    );
  END IF;

  -- Update all player scores in a single transaction
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    UPDATE session_scores
    SET
      score = (v_player->>'score')::numeric,
      accuracy_hits = CASE
        WHEN v_player->>'accuracy_hits' IS NOT NULL
        THEN (v_player->>'accuracy_hits')::integer
        ELSE NULL
      END,
      accuracy_attempts = CASE
        WHEN v_player->>'accuracy_attempts' IS NOT NULL
        THEN (v_player->>'accuracy_attempts')::integer
        ELSE NULL
      END,
      ratio_numerator = CASE
        WHEN v_player->>'ratio_numerator' IS NOT NULL
        THEN (v_player->>'ratio_numerator')::integer
        ELSE NULL
      END,
      ratio_denominator = CASE
        WHEN v_player->>'ratio_denominator' IS NOT NULL
        THEN (v_player->>'ratio_denominator')::integer
        ELSE NULL
      END,
      input_metadata = COALESCE(v_player->'input_metadata', '{}'::jsonb)
    WHERE session_id = p_session_id
      AND user_id = (v_player->>'user_id')::uuid;

    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  -- At this point, the calculate_session_winners trigger has already run
  -- and set placements and is_winner flags correctly

  -- Now mark the session as completed
  -- This is the ONLY update that will trigger the leaderboard realtime subscription
  UPDATE game_sessions
  SET
    status = 'completed',
    completed_at = now(),
    ended_at = now()
  WHERE id = p_session_id;

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_properties
  ) VALUES (
    auth.uid(),
    'game_completed',
    jsonb_build_object(
      'session_id', p_session_id,
      'game_id', v_game_id,
      'house_id', v_house_id,
      'player_count', v_updated_count,
      'completed_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'players_updated', v_updated_count,
    'already_completed', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission (already exists but included for completeness)
GRANT EXECUTE ON FUNCTION complete_game_session(uuid, jsonb) TO authenticated;
