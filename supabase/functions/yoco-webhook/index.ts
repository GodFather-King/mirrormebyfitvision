import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { decode as base64Decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Launch promo config (must match other functions)
const LAUNCH_PROMO = {
  enabled: true,
  promoPrice: 69.99,
  standardPrice: 180,
  promoMonths: 3,
};

async function verifyWebhookSignature(
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const webhookSecret = Deno.env.get("YOCO_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("YOCO_WEBHOOK_SECRET not configured");
    return false;
  }

  const msgId = headers.get("webhook-id");
  const msgTimestamp = headers.get("webhook-timestamp");
  const msgSignature = headers.get("webhook-signature");

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.error("Missing webhook verification headers");
    return false;
  }

  const timestampSeconds = parseInt(msgTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    console.error("Webhook timestamp too old or too new");
    return false;
  }

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const secretPart = webhookSecret.startsWith("whsec_")
    ? webhookSecret.slice(6)
    : webhookSecret;
  const secretBytes = base64Decode(secretPart);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );
  const expectedSignature = base64Encode(new Uint8Array(signatureBytes));

  const signatures = msgSignature.split(" ");
  for (const sig of signatures) {
    const [, sigValue] = sig.split(",");
    if (sigValue === expectedSignature) {
      return true;
    }
  }

  console.error("Webhook signature mismatch");
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log("[WEBHOOK] Incoming request received");

    const isValid = await verifyWebhookSignature(rawBody, req.headers);
    if (!isValid) {
      console.error("[WEBHOOK] ❌ Signature verification FAILED");
      return new Response("Invalid signature", { status: 401 });
    }
    console.log("[WEBHOOK] ✅ Signature verification PASSED");

    const body = JSON.parse(rawBody);
    const { type, payload } = body;
    console.log(`[WEBHOOK] Event type: ${type}`);

    if (type !== "payment.succeeded") {
      console.log(`[WEBHOOK] Ignoring non-payment event: ${type}`);
      return new Response("OK", { status: 200 });
    }

    const metadata = payload?.metadata || {};
    const userId = metadata.userId;
    const plan = metadata.plan;
    const amountInCents = payload?.amount || 0;
    const isPromo = metadata.isPromo === true;
    console.log(`[WEBHOOK] Payment metadata - userId: ${userId}, plan: ${plan}, amount: ${amountInCents}, isPromo: ${isPromo}`);

    if (!userId || !plan) {
      console.error("[WEBHOOK] ❌ Missing userId or plan in metadata:", JSON.stringify(metadata));
      return new Response("Missing data", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check existing subscription to preserve started_at for promo tracking
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("started_at, status")
      .eq("user_id", userId)
      .maybeSingle();

    const isNewSubscription = !existingSub || existingSub.status !== "active";
    const startedAt = isNewSubscription
      ? new Date().toISOString()
      : (existingSub?.started_at || new Date().toISOString());

    console.log(`[WEBHOOK] Upserting subscription - plan: ${plan}, started_at: ${startedAt}, isPromo: ${isPromo}`);

    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: plan,
          status: "active",
          payfast_payment_id: payload?.id || null,
          amount: amountInCents / 100,
          started_at: startedAt,
          expires_at: null,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[WEBHOOK] ❌ DB upsert error:", JSON.stringify(error));
      return new Response("DB error", { status: 500 });
    }

    console.log(`[WEBHOOK] ✅ Subscription activated for user ${userId}: ${plan}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] ❌ Unhandled error:", error);
    return new Response("Error", { status: 500 });
  }
});
