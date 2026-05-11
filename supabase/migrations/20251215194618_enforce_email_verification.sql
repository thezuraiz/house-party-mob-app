/*
  # Enforce Email Verification
  
  1. Purpose
    - Ensure users cannot access the app without confirming their email
    - Add database-level checks to enforce email verification
    
  2. Changes
    - Add policy to prevent unverified users from accessing profiles
    - Add check to ensure user email is confirmed
    
  3. Security
    - Prevents unverified users from using the app
    - Blocks access to profile and app data until verified
*/

-- This policy ensures that users can only access their own profile after email confirmation
-- Note: This is an additional safeguard, but the main enforcement should be in Supabase Auth settings

-- Drop existing policies that might allow access without verification
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies that check for email confirmation
CREATE POLICY "Users can view own profile (verified only)"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update own profile (verified only)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = id 
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

-- Ensure user_profile_settings also requires verification
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile settings" ON user_profile_settings;
  DROP POLICY IF EXISTS "Users can update own profile settings" ON user_profile_settings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view own profile settings (verified only)"
  ON user_profile_settings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update own profile settings (verified only)"
  ON user_profile_settings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND 
    (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

-- Insert policy still needs to work during signup (before verification)
CREATE POLICY "Users can insert own profile settings during signup"
  ON user_profile_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
