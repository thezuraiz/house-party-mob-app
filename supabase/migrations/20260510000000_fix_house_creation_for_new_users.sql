/*
  # Fix House Creation for New Users

  The 2-parameter version of check_user_can_join_house still had old limit logic
  that fails for new users whose profiles row doesn't exist yet.
  
  Update both versions to always allow house creation (matching the intent of
  the 20260226 migration that removed all restrictions except house kits).
*/

-- Fix 2-parameter version to always allow
CREATE OR REPLACE FUNCTION check_user_can_join_house(
  user_id_param uuid,
  house_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Everyone can join/create unlimited houses
  RETURN jsonb_build_object(
    'can_join', true,
    'is_premium', true,
    'current_house_count', 0,
    'reason', 'Unlimited houses for all users',
    'limit', NULL
  );
END;
$$;

-- Ensure 1-parameter version is also unrestricted
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'can_join', true,
    'is_premium', true,
    'current_house_count', 0,
    'reason', 'Unlimited houses for all users',
    'limit', NULL
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;
