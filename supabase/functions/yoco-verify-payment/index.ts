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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { checkoutId, type, kitId } = await req.json();

    console.log('[YOCO_VERIFY] Verifying payment:', { checkoutId, type, kitId, userId: user.id });

    // STEP 1: Verify payment with Yoco API
    const yocoResponse = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
      },
    });

    if (!yocoResponse.ok) {
      const errorText = await yocoResponse.text();
      console.log('[YOCO_VERIFY] Yoco API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yocoData = await yocoResponse.json();
    console.log('[YOCO_VERIFY] Yoco response:', JSON.stringify(yocoData));

    // STEP 2: Check if payment was successful
    // Yoco uses "completed" status for successful payments
    if (yocoData.status !== 'completed' && yocoData.status !== 'successful') {
      return new Response(
        JSON.stringify({ verified: false, status: yocoData.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Complete payment in database
    if (type === 'premium') {
      const { data: purchase } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('payment_transaction_id', checkoutId)
        .eq('user_id', user.id)
        .eq('product_type', 'premium')
        .maybeSingle();

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'Purchase not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (purchase.payment_status !== 'completed') {
        console.log('[YOCO_VERIFY] Using atomic transaction to complete payment');

        const { data: result, error: completionError } = await supabase
          .rpc('complete_premium_payment', {
            p_purchase_id: purchase.id,
            p_user_id: user.id,
            p_checkout_id: checkoutId,
            p_yoco_status: yocoData.status
          });

        if (completionError) {
          console.log('[YOCO_VERIFY] Failed to complete payment:', completionError);

          await supabase.from('app_logs').insert({
            level: 'error',
            event_type: 'verification_failure',
            event_name: 'premium_verify_failed',
            message: 'Manual verification failed to complete premium payment',
            user_id: user.id,
            metadata: {
              checkout_id: checkoutId,
              purchase_id: purchase.id,
              error: completionError.message
            }
          });

          return new Response(
            JSON.stringify({ error: 'Failed to complete premium payment' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[YOCO_VERIFY] Premium unlocked for user:', user.id, result);
      } else {
        console.log('[YOCO_VERIFY] Payment already completed, ensuring premium is unlocked');

        // Double-check premium is unlocked even if payment was already completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('premium_unlocked')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !profile.premium_unlocked) {
          console.log('[YOCO_VERIFY] Premium not unlocked despite completed payment, fixing...');
          await supabase
            .from('profiles')
            .update({ premium_unlocked: true })
            .eq('id', user.id);
        }
      }

      return new Response(
        JSON.stringify({ verified: true, type: 'premium' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'kit' && kitId) {
      const { data: purchase } = await supabase
        .from('user_kit_purchases')
        .select('*')
        .eq('payment_transaction_id', checkoutId)
        .eq('user_id', user.id)
        .eq('house_kit_id', kitId)
        .maybeSingle();

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'Purchase not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (purchase.payment_status !== 'completed') {
        const { error: updateError } = await supabase
          .from('user_kit_purchases')
          .update({
            payment_status: 'completed',
            metadata: {
              ...purchase.metadata,
              verified_at: new Date().toISOString(),
              yoco_status: yocoData.status,
            },
          })
          .eq('id', purchase.id);

        if (updateError) {
          console.log('[YOCO_VERIFY] Failed to update purchase:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to complete purchase' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: kitError } = await supabase
          .from('user_house_kits')
          .insert({
            user_id: user.id,
            house_kit_id: kitId,
          })
          .select()
          .maybeSingle();

        if (kitError && kitError.code !== '23505') {
          console.log('[YOCO_VERIFY] Failed to unlock kit:', kitError);
          return new Response(
            JSON.stringify({ error: 'Failed to unlock kit' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[YOCO_VERIFY] Kit unlocked for user:', user.id);
      } else {
        // Purchase already completed - ensure kit is unlocked
        const { data: existingKit } = await supabase
          .from('user_house_kits')
          .select('id')
          .eq('user_id', user.id)
          .eq('house_kit_id', kitId)
          .maybeSingle();

        if (!existingKit) {
          console.log('[YOCO_VERIFY] Purchase completed but kit not unlocked, fixing...');
          await supabase
            .from('user_house_kits')
            .insert({
              user_id: user.id,
              house_kit_id: kitId,
            })
            .select()
            .maybeSingle();
        }
      }

      return new Response(
        JSON.stringify({ verified: true, type: 'kit' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid payment type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.log('[YOCO_VERIFY] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
