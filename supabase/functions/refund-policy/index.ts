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
  <title>Refund & Cancellation Policy - HouseParty</title>
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
    .highlight { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Refund & Cancellation Policy</h1>
    <p class="last-updated">Last Updated: January 13, 2026</p>

    <p>This Refund and Cancellation Policy explains how subscriptions and payments are managed for HouseParty Premium.</p>

    <h2>1. Subscription Overview</h2>
    <p>HouseParty offers a Premium subscription with the following terms:</p>
    <ul>
      <li><strong>Price:</strong> $4.99 USD per month</li>
      <li><strong>Billing Cycle:</strong> Monthly, charged automatically</li>
      <li><strong>Payment Processor:</strong> Yoco</li>
      <li><strong>Features:</strong> Access to premium customization features, profile photos, and exclusive content</li>
    </ul>

    <h2>2. Cancellation Policy</h2>
    <p>You may cancel your Premium subscription at any time:</p>
    <ul>
      <li>Cancellations take effect at the end of the current billing period</li>
      <li>You will retain Premium access until the end of the paid period</li>
      <li>To cancel, go to Profile > Premium Settings in the app</li>
      <li>No cancellation fees apply</li>
    </ul>

    <div class="highlight">
      <strong>Important:</strong> Cancelling your subscription does not automatically trigger a refund for the current billing period.
    </div>

    <h2>3. Refund Policy</h2>
    <p>Our refund policy is as follows:</p>
    <ul>
      <li><strong>No Partial Month Refunds:</strong> We do not provide refunds for partial subscription periods</li>
      <li><strong>First-Time Subscribers:</strong> If you experience technical issues preventing app use within 48 hours of first purchase, contact us for a refund</li>
      <li><strong>Unauthorized Charges:</strong> Report unauthorized transactions within 7 days for investigation</li>
      <li><strong>Service Issues:</strong> If our service is unavailable for more than 48 consecutive hours, you may request a prorated refund</li>
    </ul>

    <h2>4. How to Request a Refund</h2>
    <p>To request a refund for qualifying situations:</p>
    <ul>
      <li>Email: billing@housepartyapp.com</li>
      <li>Include your account email and transaction details</li>
      <li>Explain the reason for the refund request</li>
      <li>We will respond within 3-5 business days</li>
    </ul>

    <h2>5. Payment Processing</h2>
    <p>All payments are processed by Yoco:</p>
    <ul>
      <li>Charges appear as "HouseParty Premium" on your statement</li>
      <li>Failed payments may result in service suspension</li>
      <li>You will receive email notifications before each billing cycle</li>
      <li>Update payment methods through the app settings</li>
    </ul>

    <h2>6. Free Trial (if applicable)</h2>
    <p>If we offer a free trial period:</p>
    <ul>
      <li>Cancel before the trial ends to avoid charges</li>
      <li>Trials are limited to one per user</li>
      <li>You will be notified before the trial converts to a paid subscription</li>
    </ul>

    <h2>7. Price Changes</h2>
    <p>We reserve the right to modify subscription prices:</p>
    <ul>
      <li>You will be notified 30 days before any price increase</li>
      <li>New prices apply to subsequent billing cycles</li>
      <li>You may cancel before the new price takes effect</li>
    </ul>

    <h2>8. In-App Purchases</h2>
    <p>For one-time purchases (emoji packs, customization items):</p>
    <ul>
      <li>All sales are final</li>
      <li>No refunds for digital goods once accessed or applied</li>
      <li>Exceptions made only for technical issues preventing delivery</li>
    </ul>

    <h2>9. Account Deletion</h2>
    <p>If you delete your account:</p>
    <ul>
      <li>Active subscriptions are cancelled immediately</li>
      <li>No refunds are provided for remaining subscription time</li>
      <li>All purchased content is permanently lost</li>
      <li>This action cannot be undone</li>
    </ul>

    <h2>10. Dispute Resolution</h2>
    <p>For billing disputes:</p>
    <ul>
      <li>Contact us first at billing@housepartyapp.com</li>
      <li>We aim to resolve disputes within 10 business days</li>
      <li>If unresolved, you may dispute the charge with your bank</li>
      <li>Chargebacks may result in account suspension pending investigation</li>
    </ul>

    <h2>11. Regional Variations</h2>
    <p>Depending on your location:</p>
    <ul>
      <li>Local consumer protection laws may provide additional rights</li>
      <li>Prices may vary by region due to currency conversion and taxes</li>
      <li>Refund policies may differ based on local regulations</li>
    </ul>

    <h2>12. Contact Us</h2>
    <p>For questions about refunds or cancellations:</p>
    <p>Email: billing@housepartyapp.com</p>
    <p>We typically respond within 1-2 business days.</p>
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