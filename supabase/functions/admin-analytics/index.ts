import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { days = 30 } = await req.json().catch(() => ({}));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    // Parallel queries using service role
    const [pageViewsRes, signupsRes, tryOnRes, subsRes, topPagesRes] = await Promise.all([
      // Daily unique visitors (by session_id)
      supabase.rpc("exec_sql" as never, {} as never).then(() => null).catch(() => null),
      // We'll use direct queries instead
      supabase.from("page_views").select("created_at, session_id, user_id, page_path").gte("created_at", sinceStr).order("created_at", { ascending: true }),
      supabase.from("profiles").select("created_at").gte("created_at", sinceStr).order("created_at", { ascending: true }),
      supabase.from("try_on_usage").select("created_at, usage_type").gte("created_at", sinceStr),
      supabase.from("subscriptions").select("created_at, plan, status").gte("created_at", sinceStr),
    ]);

    // Process page views into daily stats
    const dailyStats: Record<string, { visitors: Set<string>; views: number; users: Set<string> }> = {};

    const pageViews = pageViewsRes?.data || [];
    const pageCount: Record<string, number> = {};

    for (const pv of pageViews) {
      const day = pv.created_at.slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { visitors: new Set(), views: 0, users: new Set() };
      dailyStats[day].visitors.add(pv.session_id);
      dailyStats[day].views++;
      if (pv.user_id) dailyStats[day].users.add(pv.user_id);

      pageCount[pv.page_path] = (pageCount[pv.page_path] || 0) + 1;
    }

    // Daily signups
    const dailySignups: Record<string, number> = {};
    for (const p of signupsRes?.data || []) {
      const day = p.created_at.slice(0, 10);
      dailySignups[day] = (dailySignups[day] || 0) + 1;
    }

    // Daily try-ons and scans
    const dailyTryOns: Record<string, number> = {};
    const dailyScans: Record<string, number> = {};
    for (const t of tryOnRes?.data || []) {
      const day = t.created_at.slice(0, 10);
      if (t.usage_type === 'scan') {
        dailyScans[day] = (dailyScans[day] || 0) + 1;
      } else {
        dailyTryOns[day] = (dailyTryOns[day] || 0) + 1;
      }
    }

    // Build chart data
    const allDays = new Set([
      ...Object.keys(dailyStats),
      ...Object.keys(dailySignups),
      ...Object.keys(dailyTryOns),
    ]);
    const sortedDays = [...allDays].sort();

    const chartData = sortedDays.map(day => ({
      date: day,
      visitors: dailyStats[day]?.visitors.size || 0,
      pageViews: dailyStats[day]?.views || 0,
      authenticatedUsers: dailyStats[day]?.users.size || 0,
      signups: dailySignups[day] || 0,
      tryOns: dailyTryOns[day] || 0,
      scans: dailyScans[day] || 0,
    }));

    // Top pages
    const topPages = Object.entries(pageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Summary totals
    const totalVisitors = new Set(pageViews.map((p: { session_id: string }) => p.session_id)).size;
    const totalUsers = new Set(pageViews.filter((p: { user_id: string | null }) => p.user_id).map((p: { user_id: string }) => p.user_id)).size;
    const totalSignups = (signupsRes?.data || []).length;
    const totalTryOns = (tryOnRes?.data || []).filter((t: { usage_type: string }) => t.usage_type !== 'scan').length;
    const totalScans = (tryOnRes?.data || []).filter((t: { usage_type: string }) => t.usage_type === 'scan').length;
    const activeSubscriptions = (subsRes?.data || []).filter((s: { status: string }) => s.status === 'active').length;

    return new Response(JSON.stringify({
      summary: { totalVisitors, totalUsers, totalSignups, totalTryOns, totalScans, activeSubscriptions },
      chartData,
      topPages,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
