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
      console.log('[YOCO_KIT_INIT] Missing YOCO credentials');
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
      console.log('[YOCO_KIT_INIT] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { kitId } = await req.json();

    if (!kitId) {
      return new Response(
        JSON.stringify({ error: 'Missing kitId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[YOCO_KIT_INIT] Initializing payment for user:', user.id, 'kit:', kitId);

    const { data: kit, error: kitError } = await supabase
      .from('house_kits')
      .select('id, name, price_cents')
      .eq('id', kitId)
      .maybeSingle();

    if (kitError || !kit) {
      console.log('[YOCO_KIT_INIT] Kit not found:', kitError);
      return new Response(
        JSON.stringify({ error: 'Kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!kit.price_cents || kit.price_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Kit is not for sale' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active discount using single source of truth function
    const { data: discountPercentage, error: discountError } = await supabase
      .rpc('get_active_kit_discount', { p_kit_id: kitId });

    const discount = discountError ? 0 : (discountPercentage ?? 0);
    console.log('[YOCO_KIT_INIT] Kit-specific discount for', kitId, ':', discount, '%');

    // Apply discount to price
    let finalPriceCents = kit.price_cents;
    if (discount > 0) {
      const discountAmount = Math.floor((kit.price_cents * discount) / 100);
      finalPriceCents = kit.price_cents - discountAmount;
      console.log('[YOCO_KIT_INIT] Discount applied:', {
        originalPrice: kit.price_cents,
        discountAmount,
        finalPrice: finalPriceCents,
        discountPercentage: discount
      });
    }

    const { data: existingPurchase } = await supabase
      .from('user_kit_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('house_kit_id', kitId)
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: 'Kit already purchased' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // price_cents in DB = USD dollar amount (e.g. 4.25 = $4.25)
    // Convert to ZAR cents for Yoco payment
    let exchangeRate = 18.5;
    try {
      const rateResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        exchangeRate = rateData.rates?.ZAR || 18.5;
        console.log('[YOCO_KIT_INIT] Using live exchange rate:', exchangeRate);
      }
    } catch (err) {
      console.warn('[YOCO_KIT_INIT] Failed to fetch exchange rate, using fallback:', err);
    }

    const usdAmount = finalPriceCents; // This is now USD dollars (e.g. 4.25)
    const zarAmountInCents = Math.round(usdAmount * exchangeRate * 100);

    console.log('[YOCO_KIT_INIT] Price conversion:', {
      usdAmount,
      exchangeRate,
      zarCents: zarAmountInCents,
      zarAmount: zarAmountInCents / 100,
      discountApplied: discount
    });
    const baseUrl = req.headers.get('origin') || 'houseparty://';

    const tempCheckoutId = `temp_${Date.now()}_${user.id}`;
    const successUrl = `${baseUrl}yoco/success?type=kit&kitId=${kitId}&userId=${user.id}&tempId=${tempCheckoutId}`;

    const yocoPayload = {
      amount: zarAmountInCents,
      currency: 'ZAR',
      successUrl,
      cancelUrl: `${baseUrl}yoco/cancel?type=kit`,
      failureUrl: `${baseUrl}yoco/failure?type=kit`,
      metadata: {
        userId: user.id,
        kitId: kit.id,
        kitName: kit.name,
        tempCheckoutId,
      },
    };

    console.log('[YOCO_KIT_INIT] Creating YOCO checkout:', yocoPayload);

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
      console.log('[YOCO_KIT_INIT] YOCO error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yocoData = await yocoResponse.json();
    const checkoutId = yocoData.id;
    const redirectUrl = yocoData.redirectUrl;

    console.log('[YOCO_KIT_INIT] Checkout created:', checkoutId);

    const { error: purchaseError } = await supabase
      .from('user_kit_purchases')
      .insert({
        user_id: user.id,
        house_kit_id: kit.id,
        payment_provider: 'yoco',
        payment_transaction_id: checkoutId,
        payment_status: 'pending',
        purchase_price_cents: zarAmountInCents,
        currency: 'ZAR',
        metadata: {
          checkout_id: checkoutId,
          temp_checkout_id: tempCheckoutId,
          kit_name: kit.name,
          created_at: new Date().toISOString(),
          usd_price: usdAmount,
          exchange_rate: exchangeRate,
        },
      });

    if (purchaseError) {
      console.log('[YOCO_KIT_INIT] Error creating purchase record:', purchaseError);
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
    console.log('[YOCO_KIT_INIT] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
