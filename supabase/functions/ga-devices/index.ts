// Derniers appareils venus sur le site (données GA4).
// Utilise les mêmes secrets que ga-stats : GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY.
// À déployer SANS --no-verify-jwt : seuls les utilisateurs connectés à lightboard peuvent l'appeler.

const PROPERTY_ID = Deno.env.get("GA_PROPERTY_ID")!;
const CLIENT_EMAIL = Deno.env.get("GA_CLIENT_EMAIL")!;
const PRIVATE_KEY = Deno.env.get("GA_PRIVATE_KEY")!.replace(/\\n/g, "\n");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;

  const pem = PRIVATE_KEY.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token Google refusé : ${JSON.stringify(data)}`);
  return data.access_token;
}

async function ga(token: string, method: string, body: unknown) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:${method}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 ${method} : ${JSON.stringify(data)}`);
  return data;
}

const clean = (v: string | undefined) => (!v || v === "(not set)" ? null : v);

// "202610090341" -> "2026-10-09 03:41" (fuseau horaire de la propriété GA4)
function formatMinute(v: string): string {
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = await getAccessToken();

    const [recent, live] = await Promise.all([
      // Rapport standard : les dernières visites, par minute (délai de quelques heures possible)
      ga(token, "runReport", {
        dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
        dimensions: [
          { name: "dateHourMinute" },
          { name: "deviceCategory" },
          { name: "mobileDeviceModel" },
          { name: "operatingSystem" },
          { name: "browser" },
          { name: "country" },
          { name: "city" },
        ],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "dateHourMinute" }, desc: true }],
        limit: 25,
      }),
      // Temps réel : les 30 dernières minutes
      ga(token, "runRealtimeReport", {
        dimensions: [
          { name: "minutesAgo" },
          { name: "deviceCategory" },
          { name: "operatingSystem" },
          { name: "browser" },
          { name: "country" },
          { name: "city" },
        ],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "minutesAgo" }, desc: false }],
        limit: 25,
      }),
    ]);

    const recentRows = (recent.rows || []).map((r: any) => {
      const d = r.dimensionValues.map((x: any) => x.value);
      return {
        time: formatMinute(d[0]),
        device: clean(d[1]),
        model: clean(d[2]),
        os: clean(d[3]),
        browser: clean(d[4]),
        country: clean(d[5]),
        city: clean(d[6]),
        sessions: Number(r.metricValues[0].value),
      };
    });

    const liveRows = (live.rows || []).map((r: any) => {
      const d = r.dimensionValues.map((x: any) => x.value);
      return {
        minutesAgo: Number(d[0]),
        device: clean(d[1]),
        os: clean(d[2]),
        browser: clean(d[3]),
        country: clean(d[4]),
        city: clean(d[5]),
        users: Number(r.metricValues[0].value),
      };
    });

    return new Response(JSON.stringify({ recent: recentRows, live: liveRows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ga-devices :", err);
    return new Response(JSON.stringify({ error: "Impossible de charger les appareils." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
