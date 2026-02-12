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
    // PayFast sends ITN as application/x-www-form-urlencoded
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value as string;
    }

    console.log("PayFast ITN received:", JSON.stringify(params));

    const paymentStatus = params.payment_status;
    const userId = params.custom_str1;
    const plan = params.custom_str2;
    const pfPaymentId = params.pf_payment_id;
    const amountGross = params.amount_gross;

    if (!userId || !plan) {
      console.error("Missing user_id or plan in ITN");
      return new Response("Missing data", { status: 400 });
    }

    // Use service role to update subscription
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (paymentStatus === "COMPLETE") {
      // Calculate expiry based on plan
      let expiresAt: string | null = null;
      if (plan === "trial") {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 5);
        expiresAt = expiry.toISOString();
      }

      // Upsert subscription
      const { error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: plan,
            status: "active",
            payfast_payment_id: pfPaymentId,
            amount: parseFloat(amountGross || "0"),
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Error updating subscription:", error);
        return new Response("DB error", { status: 500 });
      }

      console.log(`Subscription updated for user ${userId}: ${plan}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("ITN processing error:", error);
    return new Response("Error", { status: 500 });
  }
});
