/*
  # Enforce Real Email Verification

  1. Purpose
    - Remove auto-confirmation of emails
    - Force users to click email confirmation link
    - Redirect to app only after email is verified
    - Block access to app features until email is confirmed

  2. Changes
    - Drop auto-confirm trigger and function
    - Update RLS policies to require email confirmation
    - Ensure only verified users can access app features

  3. Security
    - Users must verify email before accessing any app features
    - All authenticated endpoints check for email_confirmed_at
*/

-- Drop the auto-confirm trigger and function
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user_email();

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop ALL existing user_profile_settings policies
DROP POLICY IF EXISTS "Users can view own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can update own profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Users can insert own profile settings during signup" ON user_profile_settings;

-- Create NEW policies WITH email verification checks
CREATE POLICY "Users can view own profile (verified only)"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update own profile (verified only)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can insert own profile (verified only)"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can view own profile settings (verified only)"
  ON user_profile_settings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update own profile settings (verified only)"
  ON user_profile_settings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can insert own profile settings (verified only)"
  ON user_profile_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  );

-- Update handle_new_user trigger to NOT auto-confirm emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile entry (WITHOUT auto-confirming email)
  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user_profile_settings entry (will only be accessible after email verification)
  INSERT INTO public.user_profile_settings (
    user_id,
    is_private,
    push_enabled,
    email_notifications,
    friend_requests_enabled,
    show_online_status,
    has_completed_onboarding,
    created_at
  )
  VALUES (
    NEW.id,
    false,
    true,
    true,
    true,
    true,
    false,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Note: Supabase Dashboard settings must also be configured:
-- Authentication → Providers → Email → Enable "Confirm email"
