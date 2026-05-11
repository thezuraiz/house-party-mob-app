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

    if (!yocoSecretKey) {
      console.log('[YOCO_PREMIUM_INIT] Missing YOCO credentials');
      return new Response(
        JSON.stringify({ error: 'YOCO not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('[YOCO_PREMIUM_INIT] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_PREMIUM_INIT] Initializing premium payment for user:', user.id);

    const { data: existingPurchase } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_type', 'premium')
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: 'Premium already purchased' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let exchangeRate = 18.5;
    try {
      const rateResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        exchangeRate = rateData.rates?.ZAR || 18.5;
        console.log('[YOCO_PREMIUM_INIT] Using live exchange rate:', exchangeRate);
      }
    } catch (err) {
      console.warn('[YOCO_PREMIUM_INIT] Failed to fetch exchange rate, using fallback:', err);
    }

    const usdPriceCents = 499;
    const zarAmountInCents = Math.round((usdPriceCents / 100) * exchangeRate * 100);

    console.log('[YOCO_PREMIUM_INIT] Price conversion:', {
      usdCents: usdPriceCents,
      usdAmount: usdPriceCents / 100,
      exchangeRate,
      zarCents: zarAmountInCents,
      zarAmount: zarAmountInCents / 100
    });

    const baseUrl = req.headers.get('origin') || 'houseparty://';

    const tempCheckoutId = `temp_${Date.now()}_${user.id}`;
    const successUrl = `${baseUrl}yoco/success?type=premium&userId=${user.id}&tempId=${tempCheckoutId}`;

    const yocoPayload = {
      amount: zarAmountInCents,
      currency: 'ZAR',
      successUrl,
      cancelUrl: `${baseUrl}yoco/cancel?type=premium`,
      failureUrl: `${baseUrl}yoco/failure?type=premium`,
      metadata: {
        userId: user.id,
        productType: 'premium',
        tempCheckoutId,
      },
    };

    console.log('[YOCO_PREMIUM_INIT] Creating YOCO checkout:', yocoPayload);

    const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(yocoPayload),
    });

    if (!yocoResponse.ok) {
      const errorText = await yocoResponse.text();
      console.log('[YOCO_PREMIUM_INIT] YOCO error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yocoData = await yocoResponse.json();
    const checkoutId = yocoData.id;
    const redirectUrl = yocoData.redirectUrl;

    console.log('[YOCO_PREMIUM_INIT] Checkout created:', checkoutId);

    const { error: purchaseError } = await supabase
      .from('user_purchases')
      .insert({
        user_id: user.id,
        product_type: 'premium',
        payment_provider: 'yoco',
        payment_transaction_id: checkoutId,
        payment_status: 'pending',
        purchase_price_cents: zarAmountInCents,
        currency: 'ZAR',
        metadata: {
          checkout_id: checkoutId,
          temp_checkout_id: tempCheckoutId,
          created_at: new Date().toISOString(),
          usd_price_cents: usdPriceCents,
          exchange_rate: exchangeRate,
        },
      });

    if (purchaseError) {
      console.log('[YOCO_PREMIUM_INIT] Error creating purchase record:', purchaseError);
    }

    return new Response(
      JSON.stringify({
        checkoutId,
        redirectUrl,
        amount: zarAmountInCents,
        currency: 'ZAR',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.log('[YOCO_PREMIUM_INIT] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
