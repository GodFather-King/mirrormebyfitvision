import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const challenges = [
  { title: "👗 Style Challenge", body: "Try on 3 different outfits today and save your favourite!" },
  { title: "🎨 Color Clash", body: "Mix two bold colors you'd never normally pair — you might be surprised!" },
  { title: "👔 Office Ready", body: "Put together the perfect work outfit using your wardrobe." },
  { title: "🌴 Weekend Vibes", body: "Create a relaxed weekend look from your wardrobe items." },
  { title: "🔥 Trendsetter", body: "Try on something outside your comfort zone today!" },
  { title: "🧥 Layer Up", body: "Build a layered outfit — top, mid-layer, and outerwear." },
  { title: "✨ Monochrome Monday", body: "Create an all-one-color outfit. Which shade suits you best?" },
  { title: "👟 Casual Cool", body: "Style the most effortlessly cool casual outfit you can." },
  { title: "💼 Power Dressing", body: "Put together an outfit that makes you feel unstoppable." },
  { title: "🌈 Print Mix", body: "Combine two patterned items for a daring look!" },
  { title: "🪞 Mirror Check", body: "Update your avatar photo and see how your style has evolved." },
  { title: "📸 Wardrobe Refresh", body: "Upload a new clothing item to your wardrobe today." },
  { title: "🎯 Perfect Fit", body: "Find the best-fitting item in your wardrobe using size recommendations." },
  { title: "💎 Accessorise It", body: "Take any basic outfit and elevate it with accessories." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Pick today's challenge based on day-of-year for consistency
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    const challenge = challenges[dayOfYear % challenges.length];

    // Get all user IDs from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id");

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert notifications for all users
    const notifications = profiles.map((p) => ({
      user_id: p.user_id,
      title: challenge.title,
      body: challenge.body,
      type: "daily_challenge",
    }));

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) {
        console.error(`Batch insert error at offset ${i}:`, error.message);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent daily challenge to ${inserted} users`, challenge: challenge.title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Daily challenge error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
