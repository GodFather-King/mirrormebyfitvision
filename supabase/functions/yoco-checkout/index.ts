import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { plan, amount, itemName } = await req.json();

    const yocoSecretKey = Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoSecretKey) {
      throw new Error("YOCO_SECRET_KEY is not configured");
    }

    const origin = req.headers.get("origin") || "https://mirrormebyfitvision.lovable.app";
    const successUrl = `${origin}/pricing?payment=success`;
    const cancelUrl = `${origin}/pricing?payment=cancelled`;
    const failureUrl = `${origin}/pricing?payment=failed`;

    // Amount in cents for Yoco
    const amountInCents = Math.round(parseFloat(amount) * 100);

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${yocoSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: "ZAR",
        successUrl,
        cancelUrl,
        failureUrl,
        metadata: {
          userId,
          plan,
          itemName: itemName || `MirrorMe ${plan} Plan`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Yoco API error:", JSON.stringify(data));
      throw new Error(`Yoco API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({
        checkoutId: data.id,
        redirectUrl: data.redirectUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Yoco checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
