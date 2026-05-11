/*
  # Referral-Based Premium Unlock System

  1. New Tables
    - `referrals`
      - `id` (uuid, primary key)
      - `referrer_user_id` (uuid, references profiles) - User who shared the link
      - `referred_user_id` (uuid, references profiles) - User who signed up via link
      - `created_at` (timestamptz)
      - Unique constraint on (referrer_user_id, referred_user_id) to prevent duplicate referrals

  2. Schema Changes
    - Add `referral_code` (text, unique) to `profiles` - Unique code for sharing
    - Add `referral_count` (int, default 0) to `profiles` - Count of successful referrals
    - Add `premium_unlocked` (boolean, default false) to `profiles` if not exists

  3. Functions
    - `generate_referral_code()` - Generates unique 8-character referral codes
    - `handle_referral_signup()` - Processes new signup with referral code
    - `auto_unlock_premium()` - Trigger to unlock premium at 10 referrals

  4. Security
    - RLS policies on referrals table
    - Self-referral protection
    - One referral per user protection

  5. Important Notes
    - Referral codes are automatically generated on profile creation
    - Premium unlocks automatically when referral_count >= 10
    - All referrals are permanent and auditable
    - Fraud protection via unique constraints
*/

-- Add referral columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_count int DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'premium_unlocked'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_unlocked boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for fast referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT referrals_unique_referral UNIQUE (referrer_user_id, referred_user_id),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_user_id != referred_user_id)
);

-- Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view referrals they made"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Users can view referrals they received"
  ON referrals FOR SELECT
  TO authenticated
  USING (referred_user_id = auth.uid());

CREATE POLICY "System can create referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  done bool := false;
BEGIN
  WHILE NOT done LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code) THEN
      done := true;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to assign referral code to existing users without one
CREATE OR REPLACE FUNCTION backfill_referral_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET referral_code = generate_referral_code()
  WHERE referral_code IS NULL;
END;
$$;

-- Backfill existing users
SELECT backfill_referral_codes();

-- Trigger to auto-generate referral codes for new users
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON profiles;
CREATE TRIGGER ensure_referral_code_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_referral_code();

-- Function to handle referral signup
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

-- Function to get user's referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'referral_code', referral_code,
    'referral_count', referral_count,
    'premium_unlocked', premium_unlocked,
    'referrals_needed', GREATEST(0, 10 - referral_count),
    'share_url', 'houseparty://signup?ref=' || referral_code
  )
  INTO v_stats
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_stats;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_referral_signup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(uuid) TO authenticated;