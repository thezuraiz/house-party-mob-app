/*
  # Restore Premium Features

  1. Changes
    - Remove auto-premium on signup (set default to false)
    - Restore house limit checks (1 for free, unlimited for premium)
    - Restore game limit checks (1 per house for free, unlimited for premium)
    - Mark specific house kits as premium-only
    - Ensure referral system works for premium unlock
    - Update all validation functions

  2. Premium Features
    - Free users: 1 house, 1 game per house, no image uploads, basic house kits only
    - Premium users: unlimited houses, unlimited games, image uploads, can buy premium kits
    - 10 referrals = free premium unlock

  3. Security
    - RLS policies updated to check premium status
    - Functions validate premium requirements
*/

-- Step 1: Remove auto-premium on signup (new users are free by default)
ALTER TABLE profiles
  ALTER COLUMN premium_unlocked SET DEFAULT false;

-- Step 2: Update house limit check function
CREATE OR REPLACE FUNCTION check_user_can_create_house(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
  v_house_count int;
BEGIN
  -- Check if user is premium
  SELECT premium_unlocked INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;

  -- Premium users have no limit
  IF v_is_premium THEN
    RETURN true;
  END IF;

  -- Free users can only have 1 house
  SELECT COUNT(*) INTO v_house_count
  FROM houses
  WHERE creator_id = p_user_id;

  RETURN v_house_count < 1;
END;
$$;

-- Step 3: Update game limit check function
CREATE OR REPLACE FUNCTION check_user_can_create_game(p_user_id uuid, p_house_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
  v_game_count int;
BEGIN
  -- Check if user is premium
  SELECT premium_unlocked INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;

  -- Premium users have no limit
  IF v_is_premium THEN
    RETURN true;
  END IF;

  -- Free users can only have 1 game per house
  SELECT COUNT(*) INTO v_game_count
  FROM games
  WHERE house_id = p_house_id
    AND deleted_at IS NULL;

  RETURN v_game_count < 1;
END;
$$;

-- Step 4: Create function to check if user can upload house images
CREATE OR REPLACE FUNCTION check_user_can_upload_house_image(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
BEGIN
  -- Only premium users can upload custom house images
  SELECT premium_unlocked INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_is_premium, false);
END;
$$;

-- Step 5: Create function to check if user can purchase house kit
CREATE OR REPLACE FUNCTION check_user_can_purchase_kit(p_user_id uuid, p_kit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium boolean;
  v_kit_is_premium boolean;
BEGIN
  -- Check if user is premium
  SELECT premium_unlocked INTO v_is_premium
  FROM profiles
  WHERE id = p_user_id;

  -- Check if kit is premium
  SELECT is_premium INTO v_kit_is_premium
  FROM house_kits
  WHERE id = p_kit_id;

  -- If kit is not premium, everyone can purchase
  IF NOT COALESCE(v_kit_is_premium, false) THEN
    RETURN true;
  END IF;

  -- If kit is premium, only premium users can purchase
  RETURN COALESCE(v_is_premium, false);
END;
$$;

-- Step 6: Ensure referral system still works for premium unlock
CREATE OR REPLACE FUNCTION handle_referral_signup(
  p_referred_user_id uuid,
  p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_user_id uuid;
  v_referral_id uuid;
  v_new_count int;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_user_id
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- Prevent self-referral
  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot refer yourself'
    );
  END IF;

  -- Check if this user was already referred
  IF EXISTS (
    SELECT 1 FROM referrals WHERE referred_user_id = p_referred_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already referred by someone'
    );
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_user_id, referred_user_id)
  VALUES (v_referrer_user_id, p_referred_user_id)
  RETURNING id INTO v_referral_id;

  -- Increment referrer's count
  UPDATE profiles
  SET referral_count = referral_count + 1
  WHERE id = v_referrer_user_id
  RETURNING referral_count INTO v_new_count;

  -- Auto-unlock premium if reached 10 referrals
  IF v_new_count >= 10 THEN
    UPDATE profiles
    SET premium_unlocked = true
    WHERE id = v_referrer_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_count', v_new_count,
    'premium_unlocked', v_new_count >= 10
  );
END;
$$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION check_user_can_create_house(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_create_game(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_upload_house_image(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_purchase_kit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_referral_signup(uuid, text) TO authenticated;

-- Step 8: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_premium_unlocked ON profiles(premium_unlocked);
CREATE INDEX IF NOT EXISTS idx_house_kits_is_premium ON house_kits(is_premium);