import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Eye, UserPlus, Shirt, ScanLine, Crown, ArrowLeft, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import BottomNavigation from '@/components/BottomNavigation';

interface AnalyticsData {
  summary: {
    totalVisitors: number;
    totalUsers: number;
    totalSignups: number;
    totalTryOns: number;
    totalScans: number;
    activeSubscriptions: number;
  };
  chartData: Array<{
    date: string;
    visitors: number;
    pageViews: number;
    authenticatedUsers: number;
    signups: number;
    tryOns: number;
    scans: number;
  }>;
  topPages: Array<{ path: string; count: number }>;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) => (
  <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </CardContent>
  </Card>
);

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body: { days },
      });
      if (error) throw error;
      setData(result);
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, days]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const { summary, chartData, topPages } = data;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-display font-bold">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Period selector */}
        <div className="flex gap-2 mt-2">
          {[7, 14, 30].map(d => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Visitors" value={summary.totalVisitors} icon={Eye} color="bg-primary/20 text-primary" />
          <StatCard title="Logged-in Users" value={summary.totalUsers} icon={Users} color="bg-secondary/20 text-secondary" />
          <StatCard title="Signups" value={summary.totalSignups} icon={UserPlus} color="bg-green-500/20 text-green-500" />
          <StatCard title="Try-Ons" value={summary.totalTryOns} icon={Shirt} color="bg-blue-500/20 text-blue-500" />
          <StatCard title="Scans" value={summary.totalScans} icon={ScanLine} color="bg-orange-500/20 text-orange-500" />
          <StatCard title="Subscribers" value={summary.activeSubscriptions} icon={Crown} color="bg-yellow-500/20 text-yellow-500" />
        </div>

        {/* Daily visitors chart */}
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Visitors & Users</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#colorVisitors)" strokeWidth={2} name="Visitors" />
                <Area type="monotone" dataKey="authenticatedUsers" stroke="hsl(var(--secondary))" fill="url(#colorUsers)" strokeWidth={2} name="Users" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Try-ons & scans chart */}
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Try-Ons & Scans</CardTitle>
          </CardHeader>
          <CardContent className="h-48 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="tryOns" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Try-Ons" />
                <Bar dataKey="scans" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPages.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{p.path}</span>
                  <span className="font-semibold text-foreground ml-2">{p.count}</span>
                </div>
              ))}
              {topPages.length === 0 && (
                <p className="text-xs text-muted-foreground">No page views yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Analytics;
