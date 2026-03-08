import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Launch promo config (must match yoco-checkout)
const LAUNCH_PROMO = {
  promoPrice: 69.99,
  standardPrice: 180,
  promoMonths: 3,
  startDate: new Date('2025-03-08T00:00:00+02:00'),
  endDate: new Date('2025-04-10T23:59:59+02:00'),
};

function isWithinPromoWindow(date: Date): boolean {
  return date >= LAUNCH_PROMO.startDate && date <= LAUNCH_PROMO.endDate;
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

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan } = await req.json();
    if (!plan || !["premium"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if subscription already exists and is active
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, expires_at, started_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.status === "active") {
      const notExpired = !existing.expires_at || new Date(existing.expires_at) > new Date();
      if (notExpired) {
        return new Response(
          JSON.stringify({ success: true, plan: existing.plan, message: "Already active" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For new subscriptions, use promo price; preserve original started_at for existing
    const isNewSubscription = !existing || existing.status !== "active";
    const startedAt = isNewSubscription ? new Date().toISOString() : (existing?.started_at || new Date().toISOString());
    const amount = isWithinPromoWindow(new Date(startedAt)) ? LAUNCH_PROMO.promoPrice : LAUNCH_PROMO.standardPrice;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan,
          status: "active",
          amount,
          started_at: startedAt,
          expires_at: null,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Error updating subscription:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Subscription activated for user ${user.id}: ${plan}, started_at: ${startedAt}`);
    return new Response(
      JSON.stringify({ success: true, plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
