/*
  # Update Free User Limits to 1 House and 1 Game

  1. Changes
    - Update `check_user_can_join_house` function to limit free users to 1 house (down from 2)
    - Free users can only create 1 game per house (already implemented in app, this documents it)
    - Premium users still have unlimited houses and games

  2. Limits Summary
    - Free Users: 1 house maximum, 1 game per house
    - Premium Users: Unlimited houses and games

  3. Security
    - Maintains existing RLS and security definer patterns
*/

-- Update function to check if a user can join a new house (1 house limit for free users)
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
