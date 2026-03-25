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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is authenticated (basic check)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // 1. Daily Active Users (unique users with page views today)
    const { count: dauCount } = await supabase
      .from("page_views")
      .select("user_id", { count: "exact", head: true })
      .not("user_id", "is", null)
      .gte("created_at", todayStart.toISOString());

    // 2. Try-ons (today + 7d + 30d)
    const [tryOnsToday, tryOns7d, tryOns30d] = await Promise.all([
      supabase
        .from("try_on_usage")
        .select("id", { count: "exact", head: true })
        .eq("usage_type", "try_on")
        .gte("used_at", todayStart.toISOString()),
      supabase
        .from("try_on_usage")
        .select("id", { count: "exact", head: true })
        .eq("usage_type", "try_on")
        .gte("used_at", sevenDaysAgo.toISOString()),
      supabase
        .from("try_on_usage")
        .select("id", { count: "exact", head: true })
        .eq("usage_type", "try_on")
        .gte("used_at", thirtyDaysAgo.toISOString()),
    ]);

    // 3. Saved outfits (total + 7d)
    const [outfitsTotal, outfits7d] = await Promise.all([
      supabase
        .from("saved_outfits")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("saved_outfits")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

    // 4. Conversion to premium (active premium subs)
    const [totalProfiles, activePremium] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .neq("plan", "free"),
    ]);

    const totalUsers = totalProfiles.count ?? 0;
    const premiumUsers = activePremium.count ?? 0;
    const conversionRate =
      totalUsers > 0
        ? ((premiumUsers / totalUsers) * 100).toFixed(1)
        : "0.0";

    // 5. Drop-off: users who signed up in last 30d but have 0 try-ons and 0 saved avatars
    const { data: recentProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo.toISOString());

    let dropOffCount = 0;
    const recentUserIds = recentProfiles?.map((p) => p.user_id) ?? [];
    if (recentUserIds.length > 0) {
      // Users with at least 1 try-on or 1 avatar
      const { data: engagedTryOn } = await supabase
        .from("try_on_usage")
        .select("user_id")
        .in("user_id", recentUserIds);
      const { data: engagedAvatar } = await supabase
        .from("saved_avatars")
        .select("user_id")
        .in("user_id", recentUserIds);

      const engagedIds = new Set([
        ...(engagedTryOn?.map((r) => r.user_id) ?? []),
        ...(engagedAvatar?.map((r) => r.user_id) ?? []),
      ]);

      dropOffCount = recentUserIds.filter((id) => !engagedIds.has(id)).length;
    }

    const dropOffRate =
      recentUserIds.length > 0
        ? ((dropOffCount / recentUserIds.length) * 100).toFixed(1)
        : "0.0";

    const result = {
      daily_active_users: dauCount ?? 0,
      try_ons: {
        today: tryOnsToday.count ?? 0,
        last_7_days: tryOns7d.count ?? 0,
        last_30_days: tryOns30d.count ?? 0,
      },
      saved_outfits: {
        total: outfitsTotal.count ?? 0,
        last_7_days: outfits7d.count ?? 0,
      },
      conversion: {
        total_users: totalUsers,
        premium_users: premiumUsers,
        conversion_rate_pct: parseFloat(conversionRate),
      },
      drop_off: {
        recent_signups_30d: recentUserIds.length,
        inactive_users: dropOffCount,
        drop_off_rate_pct: parseFloat(dropOffRate),
      },
      generated_at: now.toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate analytics" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
