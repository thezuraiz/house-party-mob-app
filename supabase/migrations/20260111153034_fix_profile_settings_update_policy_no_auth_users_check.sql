/*
  # Fix Profile Settings Update Policy - Remove Auth Users Table Check

  This migration fixes the RLS policy on user_profile_settings that was causing 
  "permission denied for table users" errors when users tried to upload profile photos.

  ## Problem
  The existing UPDATE policy tried to check email_confirmed_at from auth.users table,
  but regular authenticated users don't have SELECT permission on auth.users, causing
  the policy check to fail.

  ## Solution
  Replace the UPDATE policy to only check that the user owns the record, without
  checking email verification status from auth.users table.

  ## Changes
  - Drop the existing restrictive UPDATE policy that checks email_confirmed_at
  - Create a new simple UPDATE policy that only verifies ownership
*/

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile settings (verified only)" ON user_profile_settings;

-- Create a simple ownership-based update policy
CREATE POLICY "Users can update own profile settings"
  ON user_profile_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
