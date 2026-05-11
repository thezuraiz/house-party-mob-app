/*
  # Restore Free User Limits

  Free users:
  - 1 house max
  - 1 game per house max
  - Cannot invite friends (premium only)
  - Basic emoji pack only (no premium packs)

  Premium users:
  - Unlimited houses
  - Unlimited games
  - Can invite friends
  - All emoji packs
*/

-- 1. House limit: Free = 1, Premium = unlimited
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
BEGIN
  -- Check premium status
  SELECT COALESCE(premium_unlocked, false) INTO is_premium
  FROM profiles WHERE id = user_id_param;

  -- If no profile row yet (new user), treat as free
  IF is_premium IS NULL THEN
    is_premium := false;
  END IF;

  -- Premium = unlimited
  IF is_premium THEN
    RETURN jsonb_build_object('can_join', true, 'is_premium', true, 'current_house_count', 0, 'reason', 'Premium user', 'limit', NULL);
  END IF;

  -- Free user: count houses
  SELECT COUNT(*) INTO current_house_count
  FROM house_members WHERE user_id = user_id_param;

  IF current_house_count < 1 THEN
    RETURN jsonb_build_object('can_join', true, 'is_premium', false, 'current_house_count', current_house_count, 'reason', 'Within free limit', 'limit', 1);
  ELSE
    RETURN jsonb_build_object('can_join', false, 'is_premium', false, 'current_house_count', current_house_count, 'reason', 'Free users can only have 1 house. Upgrade to Premium for unlimited!', 'limit', 1);
  END IF;
END;
$$;

-- 2-parameter version (called by create_house_with_admin)
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid, house_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
  is_already_member boolean;
BEGIN
  -- If already a member of this house, allow
  IF house_id_param IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM house_members WHERE user_id = user_id_param AND house_id = house_id_param) INTO is_already_member;
    IF is_already_member THEN
      RETURN jsonb_build_object('can_join', true, 'is_premium', true, 'current_house_count', 0, 'reason', 'Already a member', 'limit', NULL);
    END IF;
  END IF;

  -- Check premium
  SELECT COALESCE(premium_unlocked, false) INTO is_premium
  FROM profiles WHERE id = user_id_param;

  IF is_premium IS NULL THEN is_premium := false; END IF;
  IF is_premium THEN
    RETURN jsonb_build_object('can_join', true, 'is_premium', true, 'current_house_count', 0, 'reason', 'Premium user', 'limit', NULL);
  END IF;

  -- Free user limit
  SELECT COUNT(*) INTO current_house_count FROM house_members WHERE user_id = user_id_param;

  IF current_house_count < 1 THEN
    RETURN jsonb_build_object('can_join', true, 'is_premium', false, 'current_house_count', current_house_count, 'reason', 'Within free limit', 'limit', 1);
  ELSE
    RETURN jsonb_build_object('can_join', false, 'is_premium', false, 'current_house_count', current_house_count, 'reason', 'Free users can only have 1 house. Upgrade to Premium for unlimited!', 'limit', 1);
  END IF;
END;
$$;

-- 3. Game limit: Free = 1 per house
CREATE OR REPLACE FUNCTION check_user_can_create_game(p_user_id uuid, p_house_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
  v_game_count int;
BEGIN
  SELECT COALESCE(premium_unlocked, false) INTO v_is_premium FROM profiles WHERE id = p_user_id;
  IF v_is_premium THEN RETURN true; END IF;

  SELECT COUNT(*) INTO v_game_count FROM games WHERE house_id = p_house_id AND deleted_at IS NULL;
  RETURN v_game_count < 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_create_game(uuid, uuid) TO authenticated;
