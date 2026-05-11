/*
  # Remove All Premium Restrictions Except House Kits

  1. Changes
    - Remove house limit restrictions (allow unlimited houses for all users)
    - Remove game limit restrictions (allow unlimited games for all users)
    - Remove house image upload restriction (allow all users to upload house images)
    - Remove emoji pack restrictions (all emoji packs are now free)
    - Keep house kit purchase restrictions (premium kits still require payment)

  2. Updates
    - Update `check_user_can_join_house` to always return true
    - Make all emoji packs free
    - Document that only house kits remain as paid features

  3. Security
    - Maintains existing RLS policies
    - All users can now create unlimited houses and games
*/

-- Remove house limit restriction - everyone gets unlimited houses
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Everyone can join unlimited houses now
  RETURN jsonb_build_object(
    'can_join', true,
    'is_premium', true,
    'current_house_count', 0,
    'reason', 'Unlimited houses for all users',
    'limit', NULL
  );
END;
$$;

-- Make all emoji packs free
UPDATE emoji_packs
SET is_free = true, price_cents = 0;

-- Add comment documenting that only house kits are paid features
COMMENT ON TABLE house_kits IS 'House kits are the only premium feature requiring payment. All other features are free for all users.';
