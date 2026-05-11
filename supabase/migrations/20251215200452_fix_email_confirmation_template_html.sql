/*
  # Fix Email Confirmation Template HTML
  
  1. Purpose
    - Provide correct HTML email template for email confirmation
    - Uses same URL format as password reset (which works)
    - Properly styled button
    
  2. Changes
    - Complete HTML email template ready to paste into dashboard
    - Uses Edge Function redirect URL
    - Matches password reset behavior
*/

-- This migration provides the HTML template to paste into Supabase Dashboard
-- Go to: Authentication → Email Templates → Confirm signup

-- Paste the following HTML into the template editor:
/*
IMPORTANT: Copy everything between the HTML tags below and paste into Supabase Dashboard

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - HouseParty</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 32px; font-weight: bold; color: #10B981; margin-bottom: 8px;">🏠 HouseParty</div>
    </div>

    <div style="background-color: #1E293B; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
      <h1 style="font-size: 24px; font-weight: bold; color: #FFFFFF; margin: 0 0 16px 0;">Welcome to HouseParty!</h1>

      <p style="font-size: 16px; color: #94A3B8; line-height: 1.6; margin: 0 0 24px 0;">
        Thanks for signing up! We're excited to have you join the party.
        To get started, please confirm your email address by clicking the button below.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .SiteURL }}/functions/v1/auth-deeplink-redirect#access_token={{ .TokenHash }}&type=signup&refresh_token={{ .Token }}" 
           style="display: inline-block; background-color: #10B981; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Confirm Your Email
        </a>
      </div>

      <p style="font-size: 16px; color: #94A3B8; line-height: 1.6; margin: 24px 0 16px 0;">
        Once confirmed, you'll be able to:
      </p>

      <div style="background-color: #0F172A; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="color: #94A3B8; font-size: 15px; margin: 12px 0; padding-left: 24px; position: relative;">
          ✓ Create and join houses with friends
        </div>
        <div style="color: #94A3B8; font-size: 15px; margin: 12px 0; padding-left: 24px; position: relative;">
          ✓ Track scores and compete on leaderboards
        </div>
        <div style="color: #94A3B8; font-size: 15px; margin: 12px 0; padding-left: 24px; position: relative;">
          ✓ Unlock achievements and collect rewards
        </div>
        <div style="color: #94A3B8; font-size: 15px; margin: 12px 0; padding-left: 24px; position: relative;">
          ✓ Customize your profile and houses
        </div>
      </div>

      <p style="font-size: 14px; color: #64748B; margin: 24px 0 0 0;">
        <strong>Didn't create an account?</strong> You can safely ignore this email.
      </p>
    </div>

    <div style="text-align: center; margin-top: 32px; font-size: 14px; color: #64748B;">
      <p>This email was sent by HouseParty</p>
      <p style="margin-top: 16px;">
        <a href="{{ .SiteURL }}" style="color: #10B981; text-decoration: none;">Visit HouseParty</a>
      </p>
    </div>
  </div>
</body>
</html>

*/

SELECT 1;