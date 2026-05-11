/*
  # Fix PKCE Email Confirmation Flow

  1. Overview
    - Supports BOTH PKCE (code) and legacy (token_hash) confirmation flows
    - Updates email template to use {{ .ConfirmationURL }} variable
    - Edge function now forwards both code and token_hash parameters
    - App handles both exchangeCodeForSession and verifyOtp methods

  2. Changes
    - Email template uses Supabase's ConfirmationURL variable
    - Edge function extracts and forwards code OR token_hash
    - App detects which parameter is present and uses correct verification method

  3. Why This Fix Works
    - {{ .ConfirmationURL }} automatically includes the right params for your auth mode
    - Supporting both code and token_hash ensures compatibility
    - No more "Confirmation link is missing or invalid" errors

  4. Configuration Required in Supabase Dashboard

    Path: Authentication > Email Templates > Confirm signup

    Subject: Confirm Your Email - HouseParty

    Confirmation URL:
    https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect?type=signup

    Template Body: (see below)
*/

-- Email template HTML for Supabase Dashboard
-- Copy this into Authentication > Email Templates > Confirm signup

/*
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

          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 40px 60px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: 700;">
                Welcome to HouseParty!
              </h1>
              <p style="margin: 12px 0 0; color: #D1FAE5; font-size: 16px; font-weight: 500;">
                Score everything, anywhere
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 48px 40px; background: #1E293B;">
              <h2 style="margin: 0 0 24px; color: #F1F5F9; font-size: 24px; font-weight: 600;">
                One more step to get started
              </h2>

              <p style="margin: 0 0 32px; color: #CBD5E1; font-size: 16px; line-height: 1.6;">
                Click the button below to confirm your email address and start tracking scores with your friends.
              </p>

              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}"
                       style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);">
                      Confirm Your Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6; border-top: 1px solid #334155; padding-top: 24px;">
                This link will expire. If you didn't create a HouseParty account, you can safely ignore this email.
              </p>
            </td>
          </tr>

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

DO $$
BEGIN
  RAISE NOTICE '✅ PKCE Email Confirmation Flow Fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'ACTION REQUIRED: Update email template in Supabase Dashboard';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to: Authentication > Email Templates > Confirm signup';
  RAISE NOTICE '';
  RAISE NOTICE '2. Set Confirmation URL to:';
  RAISE NOTICE '   https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect?type=signup';
  RAISE NOTICE '';
  RAISE NOTICE '3. Copy the HTML template from this migration file';
  RAISE NOTICE '   (The template uses {{ .ConfirmationURL }}, not hardcoded URLs)';
  RAISE NOTICE '';
  RAISE NOTICE '4. Paste it into the template editor and save';
  RAISE NOTICE '';
  RAISE NOTICE '5. Test with a NEW signup (OTP tokens are single-use)';
  RAISE NOTICE '';
  RAISE NOTICE 'KEY FIXES:';
  RAISE NOTICE '  ✓ Edge function now forwards BOTH code and token_hash';
  RAISE NOTICE '  ✓ App handles exchangeCodeForSession (PKCE) AND verifyOtp (legacy)';
  RAISE NOTICE '  ✓ Using {{ .ConfirmationURL }} ensures correct params';
  RAISE NOTICE '';
END $$;
