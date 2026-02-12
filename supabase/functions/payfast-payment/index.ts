import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function md5(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
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

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email || "") as string;

    const { plan, amount, itemName } = await req.json();

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")!;

    const pfHost = "www.payfast.co.za";

    const origin = req.headers.get("origin") || "https://mirrormebyfitvision.lovable.app";
    const returnUrl = `${origin}/pricing?payment=success`;
    const cancelUrl = `${origin}/pricing?payment=cancelled`;
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-itn`;

    const paymentData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      email_address: userEmail,
      amount: parseFloat(amount).toFixed(2),
      item_name: itemName || `MirrorMe ${plan} Plan`,
      custom_str1: userId,
      custom_str2: plan,
    };

    // Generate MD5 signature
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
