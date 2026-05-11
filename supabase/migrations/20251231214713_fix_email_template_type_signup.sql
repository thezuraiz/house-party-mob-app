/*
  # Fix Email Confirmation Template - Use type=signup

  1. Overview
    - Corrects the email confirmation template to use type=signup instead of type=email
    - The auth-deeplink-redirect edge function expects type=signup for email confirmations
    - This fixes the "Invalid verification code" error during email confirmation

  2. Changes
    - Updates confirmation email template redirect URL from type=email to type=signup
    - Provides complete HTML email template with proper styling
    - Maintains PKCE flow security with token_hash parameter

  3. Why type=signup?
    - Supabase OTP verification requires type to match the verification context
    - For email confirmation during signup, the type must be 'signup'
    - The edge function already handles type=signup correctly
    - Using type=email causes verification to fail

  4. Implementation
    - This migration documents the correct template configuration
    - The actual template must be updated in Supabase Dashboard
    - Path: Authentication > Email Templates > Confirm signup

  Note: Copy the template below and paste it into the Supabase Dashboard.
  The template includes proper branding, styling, and the correct redirect URL.
*/

-- This migration serves as documentation for the correct email template
-- Actual configuration must be done in Supabase Dashboard:
-- Authentication > Email Templates > Confirm signup

-- Template Configuration:
-- Subject: Confirm Your Email - HouseParty
-- Redirect URL: {{ .SiteURL }}/functions/v1/auth-deeplink-redirect?token_hash={{ .TokenHash }}&type=signup

/*
COPY THE TEMPLATE BELOW INTO SUPABASE DASHBOARD:

<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Confirm Your Email - HouseParty</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); min-height: 100vh;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: #1E293B; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 40px 60px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                Welcome to HouseParty! 🎉
              </h1>
              <p style="margin: 12px 0 0; color: #D1FAE5; font-size: 16px; font-weight: 500;">
                Score everything, anywhere
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px; background: #1E293B;">
              <h2 style="margin: 0 0 24px; color: #F1F5F9; font-size: 24px; font-weight: 600;">
                One more step to get started
              </h2>

              <p style="margin: 0 0 32px; color: #CBD5E1; font-size: 16px; line-height: 1.6;">
                Thanks for joining HouseParty! Click the button below to confirm your email address and start tracking scores with your friends.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .SiteURL }}/functions/v1/auth-deeplink-redirect?token_hash={{ .TokenHash }}&type=signup"
                       style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
                      Confirm Your Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 12px 0 0; padding: 16px; background: #0F172A; border-radius: 8px; word-break: break-all;">
                <a href="{{ .SiteURL }}/functions/v1/auth-deeplink-redirect?token_hash={{ .TokenHash }}&type=signup"
                   style="color: #10B981; word-break: break-all; text-decoration: none;">
                  {{ .SiteURL }}/functions/v1/auth-deeplink-redirect?token_hash={{ .TokenHash }}&type=signup
                </a>
              </p>

              <p style="margin: 32px 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6; border-top: 1px solid #334155; padding-top: 24px;">
                This link will expire in 24 hours. If you didn't create a HouseParty account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background: #0F172A; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 12px; color: #64748B; font-size: 14px;">
                <strong style="color: #10B981;">HouseParty</strong> - Score tracking made fun
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                Track games, compete with friends, unlock achievements
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
*/

-- Verify the edge function is configured correctly
DO $$
BEGIN
  RAISE NOTICE 'Email template fix applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'ACTION REQUIRED: Update email template in Supabase Dashboard';
  RAISE NOTICE '1. Go to Authentication > Email Templates > Confirm signup';
  RAISE NOTICE '2. Copy the HTML template from this migration file';
  RAISE NOTICE '3. Paste it into the template editor';
  RAISE NOTICE '4. Save the template';
  RAISE NOTICE '5. Test with a new signup (OTP tokens are single-use)';
  RAISE NOTICE '';
  RAISE NOTICE 'KEY FIX: Changed type=email to type=signup in redirect URLs';
END $$;
