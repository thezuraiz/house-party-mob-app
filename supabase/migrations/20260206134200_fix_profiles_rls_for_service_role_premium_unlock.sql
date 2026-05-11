/*
  # Fix Profiles RLS for Service Role Premium Unlock
  
  ## Critical Bug Fix
  This migration fixes the root cause of premium payments not unlocking features.
  
  ## Problem Identified
  When Yoco webhook callback tries to unlock premium:
  1. Webhook runs with SERVICE_ROLE credentials
  2. Updates user_purchases successfully (no blocking RLS)
  3. FAILS to update profiles.premium_unlocked because no service_role UPDATE policy exists
  4. Result: Payment recorded as 'completed' but user stays on free tier
  
  ## Evidence
  - Multiple users have payment_status='completed' but premium_unlocked=false
  - 10+ pending payments that were actually completed but never unlocked
  
  ## Solution
  Add service_role UPDATE policy to profiles table to allow webhooks to unlock premium.
  
  ## Security
  This is safe because:
  - Only edge functions have access to SERVICE_ROLE_KEY
  - Edge functions are server-side and secure
  - This enables automated payment processing without user intervention
*/

-- Drop existing restrictive policy that blocks service role
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;

-- Add service_role UPDATE policy
CREATE POLICY "Service role can update profiles"
  ON profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also add service_role SELECT policy for completeness
DROP POLICY IF EXISTS "Service role can view profiles" ON profiles;

CREATE POLICY "Service role can view profiles"
  ON profiles
  FOR SELECT
  TO service_role
  USING (true);

-- Log this fix for debugging
INSERT INTO app_logs (
  level,
  event_type,
  event_name,
  message,
  metadata
) VALUES (
  'info',
  'system',
  'rls_fix_applied',
  'Added service_role UPDATE policy to profiles table to fix premium unlock failures',
  jsonb_build_object(
    'migration', 'fix_profiles_rls_for_service_role_premium_unlock',
    'issue', 'webhooks_blocked_by_rls',
    'impact', 'premium_payments_not_unlocking'
  )
);