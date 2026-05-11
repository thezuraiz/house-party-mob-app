Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.includes("assetlinks")) {
    return new Response(
      JSON.stringify([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.houseparty.scoretracker",
            sha256_cert_fingerprints: [
              "3D:F0:34:D0:D5:ED:6C:30:53:17:1E:77:0C:B0:1B:FF:B3:9A:AE:5A:44:BA:57:47:E7:E8:FE:20:64:6A:D5:33",
            ],
          },
        },
      ]),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  if (path.includes("apple")) {
    return new Response(
      JSON.stringify({
        applinks: {
          apps: [],
          details: [
            {
              appID: "TEAMID.com.houseparty.scoretracker",
              paths: ["/auth/confirm", "/auth/reset", "/invite", "/house/*", "/profile/*", "/session/*"],
            },
          ],
        },
        webcredentials: {
          apps: ["TEAMID.com.houseparty.scoretracker"],
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  return new Response("Use /assetlinks.json or /apple-app-site-association", {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});