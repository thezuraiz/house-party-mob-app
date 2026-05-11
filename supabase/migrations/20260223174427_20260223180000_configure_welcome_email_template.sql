/*
  # Configure Welcome Email (No Verification Required)

  1. Purpose
    - Send a friendly welcome email after signup
    - Email is informational only - no verification needed
    - Users can access app immediately
    
  2. Changes
    - Document welcome email template configuration
    - Email is sent automatically on signup
    - No action required from user
    
  3. Email Content
    - Welcome message
    - Quick start guide
    - Support information
    - No confirmation link needed
    
  Note: Email templates must be configured in Supabase Dashboard:
  Authentication → Email Templates → Confirm Signup
  
  Even though we don't require confirmation, Supabase sends this email
  on signup. We'll customize it to be a welcome message instead.
*/

-- Welcome Email Template Configuration
-- Configure in Supabase Dashboard under Authentication → Email Templates

/*
SUBJECT: Welcome to HouseParty! 🎉

HTML BODY:
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HouseParty</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: bold;">Welcome to HouseParty! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #E2E8F0;">
              <h2 style="margin: 0 0 20px 0; color: #FFFFFF; font-size: 24px;">Hey there!</h2>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Thanks for joining HouseParty! We're excited to have you here. Your account is all set up and ready to go.
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                HouseParty makes it easy to track scores and compete with friends. Here's how to get started:
              </p>
              
              <!-- Quick Start Steps -->
              <div style="background-color: #0F172A; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 16px 0; color: #10B981; font-size: 18px;">Quick Start Guide</h3>
                
                <div style="margin-bottom: 16px;">
                  <span style="display: inline-block; width: 28px; height: 28px; background-color: #10B981; color: #0F172A; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">1</span>
                  <span style="color: #E2E8F0; font-size: 15px;">Create or join a house</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                  <span style="display: inline-block; width: 28px; height: 28px; background-color: #10B981; color: #0F172A; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">2</span>
                  <span style="color: #E2E8F0; font-size: 15px;">Add games and invite friends</span>
                </div>
                
                <div>
                  <span style="display: inline-block; width: 28px; height: 28px; background-color: #10B981; color: #0F172A; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">3</span>
                  <span style="color: #E2E8F0; font-size: 15px;">Start tracking scores and compete!</span>
                </div>
              </div>
              
              <!-- Features Highlight -->
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                <strong style="color: #10B981;">What you can do:</strong>
              </p>
              
              <ul style="margin: 0 0 30px 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #CBD5E1;">
                <li>Track any type of game or competition</li>
                <li>Create custom scoring systems</li>
                <li>Compete on leaderboards</li>
                <li>Unlock achievements and badges</li>
                <li>Customize with premium kits</li>
              </ul>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Need help? We're here for you! Check out our support resources or reach out anytime.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="houseparty://app" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                  Open HouseParty
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 16px 0; color: #64748B; font-size: 14px;">
                Questions? Contact us at <a href="mailto:support@houseparty.app" style="color: #10B981; text-decoration: none;">support@houseparty.app</a>
              </p>
              
              <p style="margin: 0; color: #475569; font-size: 12px;">
                You're receiving this email because you created a HouseParty account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

PLAIN TEXT VERSION:
Welcome to HouseParty! 🎉

Hey there!

Thanks for joining HouseParty! We're excited to have you here. Your account is all set up and ready to go.

HouseParty makes it easy to track scores and compete with friends. Here's how to get started:

Quick Start Guide:
1. Create or join a house
2. Add games and invite friends
3. Start tracking scores and compete!

What you can do:
- Track any type of game or competition
- Create custom scoring systems
- Compete on leaderboards
- Unlock achievements and badges
- Customize with premium kits

Need help? We're here for you! Check out our support resources or reach out anytime.

Open HouseParty: houseparty://app

Questions? Contact us at support@houseparty.app

You're receiving this email because you created a HouseParty account.

---

INSTRUCTIONS TO CONFIGURE:
1. Go to Supabase Dashboard
2. Navigate to Authentication → Email Templates
3. Select "Confirm Signup" template
4. Copy the HTML above into the template editor
5. Update subject to: "Welcome to HouseParty! 🎉"
6. Save changes

Important: Even though we auto-confirm emails, Supabase still sends this email
on signup. We've converted it from a "confirm email" to a "welcome" message.
*/

SELECT 1; -- Configuration is done via Supabase Dashboard
