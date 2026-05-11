import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Log every single request
  console.log('[YOCO_PREMIUM_CALLBACK] ===== NEW REQUEST =====');
  console.log('[YOCO_PREMIUM_CALLBACK] Method:', req.method);
  console.log('[YOCO_PREMIUM_CALLBACK] URL:', req.url);
  console.log('[YOCO_PREMIUM_CALLBACK] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Handle GET requests for testing webhook endpoint
  if (req.method === 'GET') {
    console.log('[YOCO_PREMIUM_CALLBACK] Test GET request received');
    return new Response(
      JSON.stringify({
        status: 'online',
        message: 'YOCO Premium Callback Webhook is active',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');
    const webhookSecret = Deno.env.get('YOCO_WEBHOOK_SECRET_HOUSEPARTY_PREMIUM');

    console.log('[YOCO_PREMIUM_CALLBACK] Webhook received');

    if (!yocoSecretKey || !webhookSecret) {
      console.log('[YOCO_PREMIUM_CALLBACK] Missing YOCO credentials');
      return new Response(
        JSON.stringify({ error: 'YOCO not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read the body as text first for signature verification
    const bodyText = await req.text();
    console.log('[YOCO_PREMIUM_CALLBACK] Raw body:', bodyText);

    // Verify webhook signature
    const signature = req.headers.get('x-yoco-signature');
    if (!signature) {
      console.log('[YOCO_PREMIUM_CALLBACK] Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(bodyText)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      console.log('[YOCO_PREMIUM_CALLBACK] Invalid signature');
      console.log('[YOCO_PREMIUM_CALLBACK] Expected:', expectedSignature);
      console.log('[YOCO_PREMIUM_CALLBACK] Received:', signature);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_PREMIUM_CALLBACK] Signature verified successfully');

    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload;
    try {
      payload = JSON.parse(bodyText);
      console.log('[YOCO_PREMIUM_CALLBACK] Parsed payload:', JSON.stringify(payload));
    } catch (parseError) {
      console.log('[YOCO_PREMIUM_CALLBACK] Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, payload: eventPayload } = payload;

    if (type !== 'payment.succeeded') {
      console.log('[YOCO_PREMIUM_CALLBACK] Ignoring event type:', type);
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutId = eventPayload.id;
    const metadata = eventPayload.metadata;
    const userId = metadata?.userId;

    if (!userId) {
      console.log('[YOCO_PREMIUM_CALLBACK] Missing userId in metadata');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_PREMIUM_CALLBACK] Processing payment for user:', userId);

    const { data: purchase, error: purchaseError } = await supabase
      .from('user_purchases')
      .select('*')
      .eq('payment_transaction_id', checkoutId)
      .eq('user_id', userId)
      .eq('product_type', 'premium')
      .maybeSingle();

    if (purchaseError) {
      console.log('[YOCO_PREMIUM_CALLBACK] Error fetching purchase:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!purchase) {
      console.log('[YOCO_PREMIUM_CALLBACK] Purchase not found for checkout:', checkoutId);
      return new Response(
        JSON.stringify({ error: 'Purchase record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_PREMIUM_CALLBACK] Processing payment atomically');

    // Use atomic transaction function to prevent race conditions
    const { data: result, error: completionError } = await supabase
      .rpc('process_premium_payment_atomic', {
        p_purchase_id: purchase.id,
        p_user_id: userId,
        p_checkout_id: checkoutId,
        p_status: eventPayload.status || 'completed'
      });

    if (completionError) {
      console.log('[YOCO_PREMIUM_CALLBACK] Error completing payment:', completionError);

      // Log to app_logs for debugging
      await supabase.from('app_logs').insert({
        level: 'error',
        event_type: 'webhook_failure',
        event_name: 'premium_webhook_failed',
        message: 'Webhook callback failed to complete premium payment',
        user_id: userId,
        metadata: {
          checkout_id: checkoutId,
          purchase_id: purchase.id,
          error: completionError.message,
          yoco_event: eventPayload
        }
      });

      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!result.success) {
      if (result.error === 'concurrent_processing') {
        console.log('[YOCO_PREMIUM_CALLBACK] Concurrent processing detected, returning success');
        return new Response(
          JSON.stringify({ success: true, message: 'Processing in progress' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[YOCO_PREMIUM_CALLBACK] Processing failed:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.already_processed) {
      console.log('[YOCO_PREMIUM_CALLBACK] Payment already processed (idempotent)');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_PREMIUM_CALLBACK] Premium purchase completed successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: result.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.log('[YOCO_PREMIUM_CALLBACK] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
