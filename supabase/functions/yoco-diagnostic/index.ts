import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');

    if (!yocoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'YOCO not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { checkoutId } = await req.json();

    console.log('[YOCO_DIAGNOSTIC] Checking payment:', checkoutId);

    // Call Yoco API
    const yocoResponse = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
      },
    });

    const responseText = await yocoResponse.text();
    console.log('[YOCO_DIAGNOSTIC] Response status:', yocoResponse.status);
    console.log('[YOCO_DIAGNOSTIC] Response body:', responseText);

    let yocoData;
    try {
      yocoData = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: 'Failed to parse Yoco response',
          status: yocoResponse.status,
          body: responseText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        yocoStatus: yocoResponse.status,
        yocoData: yocoData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.log('[YOCO_DIAGNOSTIC] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
