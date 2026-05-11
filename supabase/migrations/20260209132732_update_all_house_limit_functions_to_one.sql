/*
  # Update All House Limit Functions to 1 House for Free Users

  1. Changes
    - Drop both versions of check_user_can_join_house (1-param and 2-param)
    - Recreate both with updated limit of 1 house for free users
    - Premium users still have unlimited houses and games

  2. Limits Summary
    - Free Users: 1 house maximum, 1 game per house
    - Premium Users: Unlimited houses and games

  3. Security
    - Maintains existing RLS and security definer patterns
*/

-- Drop both versions of the function
DROP FUNCTION IF EXISTS check_user_can_join_house(uuid);
DROP FUNCTION IF EXISTS check_user_can_join_house(uuid, uuid);

-- Recreate single-parameter version (for house creation)
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
  can_join boolean;
  reason text;
BEGIN
  -- Check if user is premium
  is_premium := check_user_is_premium(user_id_param);

  -- Get current house count
  current_house_count := get_user_house_count(user_id_param);

  -- Premium users can always join
  IF is_premium THEN
    can_join := true;
    reason := 'Premium user - unlimited houses';
  -- Free users limited to 1 house
  ELSIF current_house_count < 1 THEN
    can_join := true;
    reason := 'Within free tier limit';
  ELSE
    can_join := false;
    reason := 'Free tier limit reached (1 house max). Upgrade to Premium for unlimited houses!';
  END IF;

  RETURN jsonb_build_object(
    'can_join', can_join,
    'is_premium', is_premium,
    'current_house_count', current_house_count,
    'reason', reason,
    'limit', CASE WHEN is_premium THEN NULL ELSE 1 END
  );
END;
$$;

-- Recreate two-parameter version (for house joining with invite)
CREATE OR REPLACE FUNCTION check_user_can_join_house(
  user_id_param uuid,
  house_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
  is_already_member boolean;
  can_join boolean;
  reason text;
BEGIN
  -- Check if user is already a member of this house
  SELECT EXISTS (
    SELECT 1
    FROM house_members
    WHERE user_id = user_id_param
      AND house_id = house_id_param
  ) INTO is_already_member;

  -- If already a member, they can "join" (they're already in)
  IF is_already_member THEN
    RETURN jsonb_build_object(
      'can_join', true,
      'is_premium', check_user_is_premium(user_id_param),
      'current_house_count', get_user_house_count(user_id_param),
      'reason', 'Already a member of this house',
      'limit', NULL
    );
  END IF;

  -- Check if user is premium
  is_premium := check_user_is_premium(user_id_param);

  -- Get current house count
  current_house_count := get_user_house_count(user_id_param);

  -- Premium users can always join
  IF is_premium THEN
    can_join := true;
    reason := 'Premium user - unlimited houses';
  -- Free users limited to 1 house
  ELSIF current_house_count < 1 THEN
    can_join := true;
    reason := 'Within free tier limit';
  ELSE
    can_join := false;
    reason := 'Free tier limit reached (1 house max). Upgrade to Premium for unlimited houses!';
  END IF;

  RETURN jsonb_build_object(
    'can_join', can_join,
    'is_premium', is_premium,
    'current_house_count', current_house_count,
    'reason', reason,
    'limit', CASE WHEN is_premium THEN NULL ELSE 1 END
  );
END;
$$;

-- Grant execute permissions to both versions
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;
