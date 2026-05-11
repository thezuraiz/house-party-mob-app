/*
  # Fix user profile settings access during onboarding

  1. Changes
    - Remove email verification requirement from the SELECT policy for viewing own profile settings
    - Users should be able to check their onboarding status without email verification
    - Keep email verification for UPDATE operations for security
    
  2. Security
    - Users can only view their own profile settings
    - Updates still require email verification
*/

-- Drop the old policy that requires email verification for SELECT
DROP POLICY IF EXISTS "Users can view own profile settings (verified only)" ON user_profile_settings;

-- Create new policy that allows users to view their own settings during onboarding
CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
