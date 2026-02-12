import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateSignature(data: Record<string, string>, passPhrase?: string): string {
  const params: string[] = [];
  for (const key of Object.keys(data)) {
    if (data[key] !== undefined && data[key] !== "") {
      params.push(`${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}`);
    }
  }
  if (passPhrase) {
    params.push(`passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`);
  }
  const pfParamString = params.join("&");

  const encoder = new TextEncoder();
  const msgBuffer = encoder.encode(pfParamString);
  return Array.from(new Uint8Array(
    // @ts-ignore - crypto.subtle available in Deno
    await crypto.subtle.digest("MD5", msgBuffer) 
  )).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Since MD5 isn't available via crypto.subtle in all Deno versions, use a simple approach
async function md5(message: string): Promise<string> {
  // Use a manual MD5 or import
  const { createHash } = await import("https://deno.land/std@0.224.0/crypto/mod.ts");
  // Actually Deno std crypto doesn't have createHash for MD5 easily
  // Let's use the Web Crypto API with a polyfill approach
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Deno supports MD5 via std
  const { crypto as denoCrypto } = await import("https://deno.land/std@0.224.0/crypto/mod.ts");
  const hashBuffer = await denoCrypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email || "";

    const { plan, amount, itemName } = await req.json();

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")!;
    
    // PayFast sandbox or live
    const pfHost = "www.payfast.co.za";

    const returnUrl = `${req.headers.get("origin") || "https://mirrormebyfitvision.lovable.app"}/pricing?payment=success`;
    const cancelUrl = `${req.headers.get("origin") || "https://mirrormebyfitvision.lovable.app"}/pricing?payment=cancelled`;
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-itn`;

    const paymentData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      email_address: userEmail as string,
      amount: parseFloat(amount).toFixed(2),
      item_name: itemName || `MirrorMe ${plan} Plan`,
      custom_str1: userId as string,
      custom_str2: plan,
    };

    // Generate signature
    const paramString = Object.keys(paymentData)
      .filter(key => paymentData[key] !== "")
      .map(key => `${key}=${encodeURIComponent(paymentData[key].trim()).replace(/%20/g, "+")}`)
      .join("&");

    const signature = await md5(paramString);
    paymentData.signature = signature;

    return new Response(
      JSON.stringify({
        paymentData,
        pfHost,
        paymentUrl: `https://${pfHost}/eng/process`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PayFast payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
