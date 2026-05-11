/*
  # Remove Premium Unlock from Referral System

  1. Changes
    - Update handle_referral_signup() to remove premium unlock logic
    - All users have premium by default now
    - Referral system now only tracks friend invites
  
  2. Why
    - Premium is granted automatically to all users
    - Referrals are now just for tracking friend invites
    - No need to check referral count for premium unlock
*/

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

  -- Double-check if this user was already referred
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

  -- Note: Premium unlock logic removed - all users have premium by default

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_count', v_new_count
  );
END;
$$;
