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
    const body = await req.json();
    console.log("Yoco webhook received:", JSON.stringify(body));

    const { type, payload } = body;

    // Only process successful payment events
    if (type !== "payment.succeeded") {
      console.log(`Ignoring event type: ${type}`);
      return new Response("OK", { status: 200 });
    }

    const metadata = payload?.metadata || {};
    const userId = metadata.userId;
    const plan = metadata.plan;
    const amountInCents = payload?.amount || 0;

    if (!userId || !plan) {
      console.error("Missing userId or plan in webhook metadata");
      return new Response("Missing data", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate expiry based on plan
    let expiresAt: string | null = null;
    if (plan === "trial") {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 5);
      expiresAt = expiry.toISOString();
    }

    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: plan,
          status: "active",
          payfast_payment_id: payload?.id || null, // reusing column for yoco payment id
          amount: amountInCents / 100,
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Error updating subscription:", error);
      return new Response("DB error", { status: 500 });
    }

    console.log(`Subscription updated via Yoco for user ${userId}: ${plan}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Yoco webhook error:", error);
    return new Response("Error", { status: 500 });
  }
});
