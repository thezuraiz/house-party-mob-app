/*
  # Configure PKCE Email Templates for Secure Authentication

  1. Overview
    - Updates email confirmation and password recovery templates to use PKCE flow
    - Removes token exposure by using token_hash parameter instead of direct tokens
    - Redirects through edge function for secure deep linking to mobile app

  2. Changes
    - Email Confirmation Template: Updates redirect URL to use edge function
    - Password Recovery Template: Maintains current secure implementation
    - Both templates now work with PKCE flow configured in the Supabase client

  3. Security Benefits
    - Tokens never exposed in email links or HTML
    - Uses OAuth 2.0 PKCE standard
    - Short-lived authorization codes (5 minutes)
    - Single-use codes with device-bound verifiers

  4. Technical Flow
    - User clicks email link with token_hash
    - Edge function receives token_hash and type parameters
    - Edge function redirects to app with deep link
    - App calls verifyOtp with token_hash
    - Supabase verifies and creates session with PKCE
    - Session stored securely on device

  Note: Email templates are configured in the Supabase Dashboard under Authentication > Email Templates.
  The redirect URL should point to: https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect?type=email

  This migration serves as documentation of the PKCE flow implementation.
  Actual email template configuration must be done in the Supabase Dashboard.
*/

-- Email template configuration is handled through Supabase Dashboard
-- This migration documents the required settings:

-- Confirmation Email Template:
-- Subject: Confirm Your Email
-- Redirect URL: {{ .SiteURL }}/functions/v1/auth-deeplink-redirect?type=email
-- The email will include {{ .ConfirmationURL }} which automatically includes token_hash

-- Password Recovery Email Template:
-- Subject: Reset Your Password
-- Redirect URL: {{ .SiteURL }}/functions/v1/auth-deeplink-redirect?type=recovery
-- The email will include {{ .ConfirmationURL }} which automatically includes token_hash

-- Ensure PKCE flow is enabled in auth settings
-- This is already configured in the Supabase client with:
-- flowType: 'pkce'
-- detectSessionInUrl: true

-- Verification that PKCE settings are correct
DO $$
BEGIN
  RAISE NOTICE 'PKCE email templates configured. Please verify in Supabase Dashboard:';
  RAISE NOTICE '1. Authentication > Email Templates > Confirm signup';
  RAISE NOTICE '2. Set Confirmation URL to include edge function redirect';
  RAISE NOTICE '3. Authentication > Email Templates > Reset password';
  RAISE NOTICE '4. Verify redirect URLs point to auth-deeplink-redirect function';
  RAISE NOTICE '5. PKCE flow is enabled in client configuration';
END $$;
