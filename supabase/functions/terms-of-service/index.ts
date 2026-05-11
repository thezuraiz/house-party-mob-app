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
  <title>Terms of Service - HouseParty</title>
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
    <h1>Terms of Service</h1>
    <p class="last-updated">Last Updated: January 13, 2026</p>

    <p>Welcome to HouseParty. By accessing or using our mobile application, you agree to be bound by these Terms of Service.</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By creating an account and using HouseParty, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you may not use the app.</p>

    <h2>2. Eligibility</h2>
    <p>You must be at least 13 years old to use HouseParty. By using the app, you represent that you meet this age requirement.</p>

    <h2>3. Account Registration</h2>
    <p>To use HouseParty, you must:</p>
    <ul>
      <li>Provide accurate and complete registration information</li>
      <li>Maintain the security of your account credentials</li>
      <li>Notify us immediately of any unauthorized access</li>
      <li>Be responsible for all activities under your account</li>
    </ul>

    <h2>4. User Conduct</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the app for any illegal or unauthorized purpose</li>
      <li>Harass, abuse, or harm other users</li>
      <li>Impersonate any person or entity</li>
      <li>Upload malicious code or viruses</li>
      <li>Interfere with the app's operation or security</li>
      <li>Scrape or collect data from the app without permission</li>
      <li>Attempt to manipulate scores or game results</li>
    </ul>

    <h2>5. Premium Subscription</h2>
    <p>HouseParty offers a Premium subscription with enhanced features:</p>
    <ul>
      <li>Subscription fee: $4.99 USD per month</li>
      <li>Payment processed via Yoco</li>
      <li>Subscription renews automatically unless cancelled</li>
      <li>You may cancel at any time through the app</li>
      <li>No refunds for partial months</li>
    </ul>

    <h2>6. Houses and Social Features</h2>
    <p>When participating in houses:</p>
    <ul>
      <li>House creators have moderation rights</li>
      <li>You may be removed from a house at any time</li>
      <li>Your scores and statistics are visible to house members</li>
      <li>You are responsible for your interactions with other members</li>
    </ul>

    <h2>7. Intellectual Property</h2>
    <p>All content, features, and functionality of HouseParty are owned by us and protected by copyright, trademark, and other laws. You may not:</p>
    <ul>
      <li>Copy or distribute app content without permission</li>
      <li>Reverse engineer or decompile the app</li>
      <li>Use our trademarks without authorization</li>
    </ul>

    <h2>8. User Content</h2>
    <p>You retain ownership of content you upload (profile photos, usernames). By uploading content, you grant us a license to use, store, and display it as necessary to provide our services.</p>

    <h2>9. Termination</h2>
    <p>We may suspend or terminate your account if:</p>
    <ul>
      <li>You violate these Terms</li>
      <li>You engage in fraudulent activity</li>
      <li>Your account remains inactive for an extended period</li>
      <li>Required by law or regulatory authorities</li>
    </ul>

    <h2>10. Disclaimers</h2>
    <p>HouseParty is provided "as is" without warranties of any kind. We do not guarantee:</p>
    <ul>
      <li>Uninterrupted or error-free service</li>
      <li>Complete accuracy of data</li>
      <li>Specific results from using the app</li>
    </ul>

    <h2>11. Limitation of Liability</h2>
    <p>To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages arising from your use of HouseParty.</p>

    <h2>12. Dispute Resolution</h2>
    <p>Any disputes will be resolved through binding arbitration rather than in court, except where prohibited by law.</p>

    <h2>13. Changes to Terms</h2>
    <p>We may modify these Terms at any time. Continued use of the app after changes constitutes acceptance of the new Terms.</p>

    <h2>14. Contact Information</h2>
    <p>For questions about these Terms, contact us at:</p>
    <p>Email: support@housepartyapp.com</p>
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