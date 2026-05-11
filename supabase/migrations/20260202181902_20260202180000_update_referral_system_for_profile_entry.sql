/*
  # Update Referral System for Profile-Based Entry

  1. Schema Changes
    - Add `referral_used` column to profiles (tracks if user has already submitted a referral code)

  2. Function Updates
    - Update `handle_referral_signup` to:
      - Check if user has already used a referral code
      - Allow calling after signup (from profile page)
      - Validate against self-referral
      - Update `referral_used` flag

  3. Security
    - RLS policies remain the same
    - Users can only submit one referral code ever

  4. Important Notes
    - Users who signed up with a referral code will have `referral_used = true`
    - Users who haven't used a code can enter one from their profile page
    - Once submitted, referral codes cannot be changed
*/

-- Add referral_used column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_used boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Backfill: Mark users who already have referrals as having used their code
UPDATE profiles
SET referral_used = true
WHERE id IN (
  SELECT referred_user_id FROM referrals
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_used ON profiles(referral_used);

-- Update handle_referral_signup function
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
  v_already_used boolean;
BEGIN
  -- Check if user has already used a referral code
  SELECT referral_used INTO v_already_used
  FROM profiles
  WHERE id = p_referred_user_id;

  IF v_already_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already used a referral code'
    );
  END IF;

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
      'error', 'You cannot use your own referral code'
    );
  END IF;

  -- Double-check if this user was already referred (shouldn't happen with referral_used check)
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

  -- Mark user as having used a referral code
  UPDATE profiles
  SET referral_used = true
  WHERE id = p_referred_user_id;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_referral_signup(uuid, text) TO authenticated;
