/*
  # Fix Email Verification Setup
  
  1. Changes
    - Remove auto-confirmation behavior
    - Ensure email confirmation is properly enforced
    - Let Supabase handle verification emails
    
  2. Purpose
    - Enable proper email verification flow
    - Users should receive verification emails on signup
    
  3. Notes
    - Make sure your Supabase project has email sending enabled
    - Check Authentication > Providers > Email in dashboard
    - Verify your email templates are configured
*/

-- Update the handle_new_user function to NOT auto-confirm
-- This ensures proper email verification flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, coins, level, experience_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0,
    1,
    0
  );
  
  -- Create user profile settings with onboarding flag set to false
  INSERT INTO public.user_profile_settings (user_id, has_completed_onboarding)
  VALUES (new.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;
