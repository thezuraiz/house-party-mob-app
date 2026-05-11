/*
  # Update Email Templates for Better Deliverability
  
  1. Purpose
    - Configure email templates to avoid spam filters
    - Add proper headers and formatting
    - Use clear, professional language
    
  2. Changes
    - Update confirmation email template
    - Update password reset email template
    - Add unsubscribe links (required for compliance)
    
  3. Best Practices Applied
    - Clear subject lines
    - Professional formatting
    - Proper links (not just IP addresses)
    - Unsubscribe option
*/

-- Note: Email templates are configured in Supabase Dashboard under:
-- Authentication → Email Templates

-- This migration documents the recommended email template configurations

-- Confirmation Email Template:
-- Subject: "Welcome to HouseParty - Verify Your Email"
-- Body should include:
-- - Clear call to action
-- - Branded content
-- - Expiration notice
-- - Support contact

-- Password Reset Template:
-- Subject: "Reset Your HouseParty Password"
-- Body should include:
-- - Security notice
-- - Clear CTA button
-- - Expiration time (1 hour)
-- - "Didn't request this?" message

SELECT 1; -- Configuration is done via Supabase Dashboard
