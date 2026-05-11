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
      return new Response(
        JSON.stringify({ error: 'YOCO not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[RECOVER_PAYMENTS] Starting recovery process...');

    // Find premium purchases stuck in pending for > 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: pendingPurchases, error: fetchError } = await supabase
      .from('user_purchases')
      .select('*')
      .eq('payment_status', 'pending')
      .eq('product_type', 'premium')
      .lt('created_at', fiveMinutesAgo);

    if (fetchError) {
      console.log('[RECOVER_PAYMENTS] Error fetching pending purchases:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending purchases' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RECOVER_PAYMENTS] Found ${pendingPurchases?.length || 0} pending purchases`);

    const results = [];
    const errors = [];

    for (const purchase of pendingPurchases || []) {
      try {
        console.log(`[RECOVER_PAYMENTS] Checking purchase ${purchase.id} for user ${purchase.user_id}`);

        if (!purchase.payment_transaction_id) {
          console.log(`[RECOVER_PAYMENTS] Skipping purchase ${purchase.id} - no transaction ID`);
          continue;
        }

        // Check with Yoco if payment actually completed
        const yocoResponse = await fetch(
          `https://payments.yoco.com/api/checkouts/${purchase.payment_transaction_id}`,
          {
            headers: { 'Authorization': `Bearer ${yocoSecretKey}` }
          }
        );

        if (!yocoResponse.ok) {
          console.log(`[RECOVER_PAYMENTS] Yoco API error for ${purchase.payment_transaction_id}:`, yocoResponse.status);
          errors.push({
            purchase_id: purchase.id,
            user_id: purchase.user_id,
            error: `Yoco API returned ${yocoResponse.status}`
          });
          continue;
        }

        const yocoData = await yocoResponse.json();
        console.log(`[RECOVER_PAYMENTS] Yoco status for ${purchase.payment_transaction_id}:`, yocoData.status);

        if (yocoData.status === 'completed' || yocoData.status === 'successful') {
          // Payment succeeded but wasn't processed - FIX IT NOW
          console.log(`[RECOVER_PAYMENTS] Recovering payment for user ${purchase.user_id}`);

          const { data: result, error: completionError } = await supabase
            .rpc('complete_premium_payment', {
              p_purchase_id: purchase.id,
              p_user_id: purchase.user_id,
              p_checkout_id: purchase.payment_transaction_id,
              p_yoco_status: yocoData.status
            });

          if (completionError) {
            console.log(`[RECOVER_PAYMENTS] Failed to complete payment ${purchase.id}:`, completionError);
            errors.push({
              purchase_id: purchase.id,
              user_id: purchase.user_id,
              error: completionError.message
            });
          } else {
            console.log(`[RECOVER_PAYMENTS] Successfully recovered payment for user ${purchase.user_id}`);
            results.push({
              purchase_id: purchase.id,
              user_id: purchase.user_id,
              status: 'recovered',
              yoco_status: yocoData.status
            });
          }
        } else {
          console.log(`[RECOVER_PAYMENTS] Payment ${purchase.payment_transaction_id} not completed (status: ${yocoData.status})`);
        }
      } catch (error) {
        console.log(`[RECOVER_PAYMENTS] Error processing purchase ${purchase.id}:`, error);
        errors.push({
          purchase_id: purchase.id,
          user_id: purchase.user_id,
          error: error.message
        });
      }
    }

    console.log(`[RECOVER_PAYMENTS] Recovery complete. Recovered: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        recovered: results.length,
        failed: errors.length,
        results,
        errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.log('[RECOVER_PAYMENTS] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
