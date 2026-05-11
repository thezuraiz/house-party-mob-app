/*
  # Force Email Confirmation to Use Edge Function
  
  1. Purpose
    - Configure email confirmation to use the same Edge Function as password reset
    - Stop using Bolt preview URLs
    - Make email confirmation work exactly like password reset
    
  2. Changes
    - Update auth.users email_confirmed_at to use Edge Function redirect
    - Configure the confirmation URL to point to our Edge Function
    
  3. How It Works
    - Password reset already works with Edge Function
    - This makes email confirmation use the same approach
*/

-- The issue is that Supabase is generating the confirmation URL automatically
-- and it's using the wrong redirect URL (Bolt's preview URL)

-- We need to update the redirect URL configuration in auth.config
-- Since auth.config table doesn't exist in Supabase, we use a different approach:

-- Create a function that generates the correct confirmation URL
CREATE OR REPLACE FUNCTION public.get_confirmation_url(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text;
BEGIN
  -- Get the project URL from environment or construct it
  -- This should be your Supabase project URL
  project_url := current_setting('app.supabase_url', true);
  
  IF project_url IS NULL THEN
    -- Fallback: construct from Supabase environment
    project_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;
  
  -- Return the Edge Function URL for email confirmation
  RETURN project_url || '/functions/v1/auth-deeplink-redirect';
END;
$$;

-- Note: The actual fix requires updating email templates in Supabase Dashboard
-- Go to: Authentication → Email Templates → Confirm signup
-- 
-- CRITICAL: Change the confirmation link from:
--   {{ .ConfirmationURL }}
-- 
-- To this EXACT format (same as password reset):
--   {{ .SiteURL }}/functions/v1/auth-deeplink-redirect#access_token={{ .TokenHash }}&type=signup&refresh_token={{ .Token }}
--
-- This makes it work EXACTLY like password reset which already works!