import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { decode as base64Decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  // Check timestamp tolerance (5 minutes)
  const timestampSeconds = parseInt(msgTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    console.error("Webhook timestamp too old or too new");
    return false;
  }

  // Build signed content: id.timestamp.body
  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;

  // Decode secret (strip "whsec_" prefix, then base64-decode)
  const secretPart = webhookSecret.startsWith("whsec_")
    ? webhookSecret.slice(6)
    : webhookSecret;
  const secretBytes = base64Decode(secretPart);

  // Compute HMAC-SHA256
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

  // Compare against all signatures in the header (format: "v1,sig1 v1,sig2")
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

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, req.headers);
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
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
