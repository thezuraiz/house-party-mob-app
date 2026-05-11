/*
  # Fix Password Reset with Direct Deep Link

  ## Problem
  Password reset was using an edge function redirect which doesn't properly
  forward PKCE parameters (token_hash). This caused "Reset link is invalid or expired"
  errors because the app never received the token_hash.

  ## Solution
  Use direct deep link for password reset, just like email confirmation.
  The Supabase PKCE flow will include token_hash as a query parameter that
  the app can parse directly.

  ## Changes
  1. Updated AuthContext to use: houseparty://reset-password
  2. Updated deepLinking.ts to properly handle token_hash parameter
  3. reset-password.tsx already handles token_hash correctly with verifyOtp

  ## Required Dashboard Configuration
  
  In Supabase Dashboard > Authentication > URL Configuration:
  
  1. Add to Redirect URLs:
     - houseparty://reset-password
  
  2. Email Template for "Reset Password":
     - Make sure the template uses {{ .ConfirmationURL }}
     - The redirect URL will automatically include token_hash parameter
  
  ## Flow
  1. User requests password reset
  2. Email sent with link: houseparty://reset-password?token_hash=...&type=recovery
  3. OS opens app directly with full URL
  4. App parses token_hash from query parameters
  5. App calls supabase.auth.verifyOtp({ type: 'recovery', token_hash })
  6. User enters new password and updates successfully
*/

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 Password Reset Configuration Update';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'ACTION REQUIRED IN SUPABASE DASHBOARD:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to: Authentication > URL Configuration';
  RAISE NOTICE '';
  RAISE NOTICE '2. Add this to Redirect URLs:';
  RAISE NOTICE '   houseparty://reset-password';
  RAISE NOTICE '';
  RAISE NOTICE '3. Verify Email Template for "Reset Password":';
  RAISE NOTICE '   - Template should use {{ .ConfirmationURL }}';
  RAISE NOTICE '   - Supabase will automatically append token_hash';
  RAISE NOTICE '';
  RAISE NOTICE 'CODE CHANGES ALREADY APPLIED:';
  RAISE NOTICE '  ✓ AuthContext uses direct deep link';
  RAISE NOTICE '  ✓ deepLinking.ts parses token_hash correctly';
  RAISE NOTICE '  ✓ reset-password.tsx handles verifyOtp';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FLOW:';
  RAISE NOTICE '  Email → App directly (params preserved)';
  RAISE NOTICE '  App parses token_hash from query params';
  RAISE NOTICE '  Token verified and session created';
  RAISE NOTICE '  User updates password successfully';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
