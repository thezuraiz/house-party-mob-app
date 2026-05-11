/*
  # Disable Email Verification Completely - Final Fix

  1. Purpose
    - Allow users to sign up and use the app immediately without email verification
    - Remove ALL email verification barriers from signup flow
    - Auto-confirm all new and existing users
    
  2. Changes
    - Drop email verification checks from ALL RLS policies
    - Auto-confirm all existing unverified users
    - Add trigger to auto-confirm new signups
    
  3. Impact
    - Users can access app immediately after signup
    - No "confirm your email" step
    - Should dramatically improve onboarding completion rate
*/

-- Auto-confirm ALL existing unconfirmed users
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "Users can view own profile (verified only)" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile (verified only)" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile (verified only)" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop ALL existing user_profile_settings policies
DROP POLICY IF EXISTS "Users can view own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can insert own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can view own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can insert own profile settings during signup" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can insert own profile settings" ON user_profile_settings;

-- Create policies WITHOUT email verification checks
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile settings"
  ON user_profile_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile settings"
  ON user_profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create auto-confirm function
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm email immediately on signup
  NEW.email_confirmed_at := NOW();
  RETURN NEW;
END;
$$;

-- Create trigger to auto-confirm new users
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();
