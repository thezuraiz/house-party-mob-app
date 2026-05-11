/*
  # Fix Onboarding Loop - Remove auth.users Queries from RLS

  1. Problem
    - RLS policies in user_profile_settings were querying auth.users table
    - Authenticated users don't have permission to query auth.users directly
    - This caused "permission denied for table users" errors
    - Led to profile creation failures and onboarding loops

  2. Solution
    - Remove email_confirmed_at checks from RLS policies
    - Email verification is enforced at auth level, not RLS level
    - Simplify policies to only check auth.uid() = user_id
    - Keep public viewing policy for friend visibility

  3. Changes
    - Drop and recreate SELECT policy without auth.users query
    - Drop and recreate UPDATE policy without auth.users query
    - Keep INSERT policies unchanged (they don't query auth.users)
    - Keep public viewing policy for friends
*/

-- Drop existing policies that query auth.users
DROP POLICY IF EXISTS "Users can view own profile settings (verified only)" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings (verified only)" ON user_profile_settings;

-- Recreate SELECT policy without auth.users query
CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate UPDATE policy without auth.users query
CREATE POLICY "Users can update own profile settings"
  ON user_profile_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify public viewing policy still exists for friends (should not be affected)
-- This policy allows viewing other users' settings if they're not private or if you're friends
-- No changes needed to this policy as it doesn't query auth.users
