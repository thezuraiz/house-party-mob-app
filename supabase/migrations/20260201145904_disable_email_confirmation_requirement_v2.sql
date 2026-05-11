/*
  # Disable Email Confirmation Requirement for Sign-In
  
  1. Purpose
    - Allow users to sign in without email confirmation
    - Auto-confirm all existing unconfirmed users
    - Remove email verification checks from RLS policies
    
  2. Changes
    - Auto-confirm all existing users
    - Update RLS policies to remove email confirmation checks
    - Add trigger to auto-confirm new signups
    
  3. Security
    - Users can still verify emails later if needed
    - Does not compromise security for authenticated-only access
*/

-- Auto-confirm all existing unconfirmed users
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "Users can view own profile (verified only)" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile (verified only)" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop ALL existing user_profile_settings policies
DROP POLICY IF EXISTS "Users can view own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can view own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can insert own profile settings during signup" ON user_profile_settings;

-- Create NEW policies WITHOUT email verification checks
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile settings"
  ON user_profile_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile settings during signup"
  ON user_profile_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-confirm new user emails on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm email if not already confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();
