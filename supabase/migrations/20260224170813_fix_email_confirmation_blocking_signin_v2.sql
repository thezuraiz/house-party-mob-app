/*
  # Fix Email Confirmation Blocking Sign In - V2

  1. Purpose
    - Ensure users can sign in immediately after signup
    - Fix the "Email not confirmed" error on login
    - Auto-confirm all users at signup time
    
  2. Changes
    - Update auto-confirm trigger to run properly
    - Ensure all existing users have email_confirmed_at set
    - confirmed_at is a generated column so we only update email_confirmed_at
    
  3. Impact
    - Users can log in immediately after signup
    - No "Email not confirmed" errors
    - Welcome email will be sent to confirmed users
*/

-- First, confirm ALL existing users by setting email_confirmed_at
-- confirmed_at is auto-generated from email_confirmed_at
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user_email();

-- Create improved auto-confirm function
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Auto-confirm email immediately on signup
  -- confirmed_at will be auto-generated from email_confirmed_at
  NEW.email_confirmed_at := NOW();
  
  RAISE LOG 'Auto-confirming user email for: %', NEW.email;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-confirm new users BEFORE they are inserted
CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_confirm_user_email() TO postgres, service_role, authenticated, anon;
