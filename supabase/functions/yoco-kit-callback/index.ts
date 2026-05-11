import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');
    const webhookSecret = Deno.env.get('YOCO_WEBHOOK_SECRET_HOUSEPARTY_KIT');

    console.log('[YOCO_KIT_CALLBACK] Webhook received');

    if (!yocoSecretKey || !webhookSecret) {
      console.log('[YOCO_KIT_CALLBACK] Missing YOCO credentials');
      return new Response(
        JSON.stringify({ error: 'YOCO not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read the body as text first for signature verification
    const bodyText = await req.text();

    // Verify webhook signature
    const signature = req.headers.get('x-yoco-signature');
    if (!signature) {
      console.log('[YOCO_KIT_CALLBACK] Missing signature header');
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
      console.log('[YOCO_KIT_CALLBACK] Invalid signature');
      console.log('[YOCO_KIT_CALLBACK] Expected:', expectedSignature);
      console.log('[YOCO_KIT_CALLBACK] Received:', signature);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_KIT_CALLBACK] Signature verified successfully');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = JSON.parse(bodyText);

    console.log('[YOCO_KIT_CALLBACK] Payload:', JSON.stringify(payload));

    const { type, payload: eventPayload } = payload;

    if (type !== 'payment.succeeded') {
      console.log('[YOCO_KIT_CALLBACK] Ignoring event type:', type);
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutId = eventPayload.id;
    const metadata = eventPayload.metadata;
    const userId = metadata?.userId;
    const kitId = metadata?.kitId;

    if (!userId || !kitId) {
      console.log('[YOCO_KIT_CALLBACK] Missing userId or kitId in metadata');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_KIT_CALLBACK] Processing kit purchase:', { userId, kitId });

    const { data: purchase, error: purchaseError } = await supabase
      .from('user_kit_purchases')
      .select('*')
      .eq('payment_transaction_id', checkoutId)
      .eq('user_id', userId)
      .eq('house_kit_id', kitId)
      .maybeSingle();

    if (purchaseError) {
      console.log('[YOCO_KIT_CALLBACK] Error fetching purchase:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!purchase) {
      console.log('[YOCO_KIT_CALLBACK] Purchase not found for checkout:', checkoutId);
      return new Response(
        JSON.stringify({ error: 'Purchase record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use atomic function to process payment (prevents race conditions)
    console.log('[YOCO_KIT_CALLBACK] Processing payment atomically');
    const { data: result, error: atomicError } = await supabase.rpc('process_kit_payment_atomic', {
      p_purchase_id: purchase.id,
      p_checkout_id: checkoutId,
      p_status: eventPayload.status || 'completed'
    });

    if (atomicError) {
      console.log('[YOCO_KIT_CALLBACK] Atomic processing error:', atomicError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!result.success) {
      if (result.error === 'concurrent_processing') {
        console.log('[YOCO_KIT_CALLBACK] Concurrent processing detected, returning success');
        return new Response(
          JSON.stringify({ success: true, message: 'Processing in progress' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[YOCO_KIT_CALLBACK] Processing failed:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.already_processed) {
      console.log('[YOCO_KIT_CALLBACK] Payment already processed (idempotent)');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_KIT_CALLBACK] Kit purchase completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: result.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.log('[YOCO_KIT_CALLBACK] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
