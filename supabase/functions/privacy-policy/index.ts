const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - HouseParty</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; padding: 20px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    h1 { color: #10B981; margin-bottom: 10px; font-size: 28px; }
    h2 { color: #059669; margin-top: 30px; margin-bottom: 15px; font-size: 20px; }
    p { margin-bottom: 15px; }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .last-updated { color: #64748B; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: January 13, 2026</p>

    <p>HouseParty ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.</p>

    <h2>1. Information We Collect</h2>
    <p>We collect the following types of information:</p>
    <ul>
      <li><strong>Account Information:</strong> Email address, username, and profile photo (optional)</li>
      <li><strong>Game Data:</strong> Scores, game sessions, house memberships, and leaderboard statistics</li>
      <li><strong>Usage Data:</strong> App interactions, features used, and performance data</li>
      <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We use collected information to:</p>
    <ul>
      <li>Provide and maintain our services</li>
      <li>Track game scores and maintain leaderboards</li>
      <li>Enable social features (houses, friends, competitions)</li>
      <li>Process payments through Yoco</li>
      <li>Send important service notifications</li>
      <li>Improve app performance and user experience</li>
      <li>Prevent fraud and ensure security</li>
    </ul>

    <h2>3. Information Sharing</h2>
    <p>We share your information only in these situations:</p>
    <ul>
      <li><strong>With Other Users:</strong> Your username, profile photo, and game statistics are visible to members of houses you join</li>
      <li><strong>Payment Processor:</strong> Yoco processes payments and receives necessary transaction information</li>
      <li><strong>Service Providers:</strong> Supabase (database and authentication) processes data on our behalf</li>
      <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
    </ul>

    <h2>4. Data Security</h2>
    <p>We implement industry-standard security measures including:</p>
    <ul>
      <li>Encrypted data transmission (HTTPS/TLS)</li>
      <li>Secure authentication via Supabase</li>
      <li>Row-level security on database access</li>
      <li>Regular security audits and updates</li>
    </ul>

    <h2>5. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Correct inaccurate information</li>
      <li>Delete your account and associated data</li>
      <li>Opt-out of promotional communications</li>
      <li>Export your data</li>
    </ul>

    <h2>6. Data Retention</h2>
    <p>We retain your information for as long as your account is active or as needed to provide services. You may delete your account at any time through the app settings.</p>

    <h2>7. Children's Privacy</h2>
    <p>Our service is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.</p>

    <h2>8. International Users</h2>
    <p>Your information may be transferred to and stored in countries other than your own. By using our service, you consent to such transfers.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or app notification.</p>

    <h2>10. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us at:</p>
    <p>Email: privacy@housepartyapp.com</p>
  </div>
</body>
</html>
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  return new Response(htmlContent, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});