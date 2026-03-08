import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Launch promo config with date window
const LAUNCH_PROMO = {
  promoPrice: 69.99,
  standardPrice: 180,
  promoMonths: 3,
  startDate: new Date('2025-03-13T00:00:00+02:00'),
  endDate: new Date('2025-04-10T23:59:59+02:00'),
};

function isWithinPromoWindow(date: Date): boolean {
  return date >= LAUNCH_PROMO.startDate && date <= LAUNCH_PROMO.endDate;
}

function getPromoAmount(startedAt: string | null): number {
  // For new subscriptions: check if NOW is within the promo window
  if (!startedAt) {
    return isWithinPromoWindow(new Date()) ? LAUNCH_PROMO.promoPrice : LAUNCH_PROMO.standardPrice;
  }
  // For existing subscriptions: check if they STARTED within the promo window
  const start = new Date(startedAt);
  if (!isWithinPromoWindow(start)) return LAUNCH_PROMO.standardPrice;
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return monthsElapsed < LAUNCH_PROMO.promoMonths ? LAUNCH_PROMO.promoPrice : LAUNCH_PROMO.standardPrice;
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

    // Check if user has existing subscription to determine promo eligibility
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("started_at, plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    // Determine the correct amount based on promo status
    const effectiveAmount = getPromoAmount(existingSub?.started_at || null);

    const origin = req.headers.get("origin") || "https://mirrormebyfitvision.lovable.app";
    const successUrl = `${origin}/pricing?payment=success`;
    const cancelUrl = `${origin}/pricing?payment=cancelled`;
    const failureUrl = `${origin}/pricing?payment=failed`;

    const amountInCents = Math.round(effectiveAmount * 100);

    console.log(`[CHECKOUT] User ${userId}, plan: ${plan}, promo amount: R${effectiveAmount}, cents: ${amountInCents}`);

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
          isPromo: isWithinPromoWindow(new Date()) && effectiveAmount === LAUNCH_PROMO.promoPrice,
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
