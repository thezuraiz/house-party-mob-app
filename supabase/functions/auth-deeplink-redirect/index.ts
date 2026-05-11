Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      }
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "signup";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");

  console.log(`[AUTH-REDIRECT] Received params:`, {
    type,
    hasCode: !!code,
    hasTokenHash: !!token_hash,
  });

  const params = new URLSearchParams();
  params.set("type", type);

  if (code) {
    params.set("code", code);
    console.log(`[AUTH-REDIRECT] Forwarding PKCE code (length: ${code.length})`);
  }
  if (token_hash) {
    params.set("token_hash", token_hash);
    console.log(`[AUTH-REDIRECT] Forwarding token_hash (length: ${token_hash.length})`);
  }

  const deepLink =
    type === "recovery"
      ? `houseparty://reset-password?${params.toString()}`
      : `houseparty://confirm-email?${params.toString()}`;

  console.log(`[AUTH-REDIRECT] Redirecting to: ${deepLink}`);

  return new Response("Redirecting to HouseParty app...", {
    status: 302,
    headers: {
      "Location": deepLink,
      "Cache-Control": "no-store",
    },
  });
});