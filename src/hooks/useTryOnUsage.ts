import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const FREE_DAILY_LIMIT = 2;

export const useTryOnUsage = () => {
  const { user } = useAuth();
  const [dailyCount, setDailyCount] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const isFreePlan = currentPlan === 'free';
  const remaining = Math.max(0, FREE_DAILY_LIMIT - dailyCount);
  const isAtLimit = isFreePlan && dailyCount >= FREE_DAILY_LIMIT;

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [usageRes, subRes] = await Promise.all([
      supabase
        .from('try_on_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('used_at', todayStart.toISOString()),
      supabase
        .from('subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    setDailyCount(usageRes.count ?? 0);

    if (subRes.data && subRes.data.status === 'active') {
      if (subRes.data.expires_at && new Date(subRes.data.expires_at) < new Date()) {
        setCurrentPlan('free');
      } else {
        setCurrentPlan(subRes.data.plan);
      }
    } else {
      setCurrentPlan('free');
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const recordUsage = useCallback(async (itemId?: string) => {
    if (!user) return;
    await supabase.from('try_on_usage').insert({
      user_id: user.id,
      item_id: itemId || null,
    });
    setDailyCount(prev => prev + 1);
  }, [user]);

  return {
    dailyCount,
    remaining,
    isFreePlan,
    isAtLimit,
    currentPlan,
    loading,
    recordUsage,
    refreshUsage: fetchUsage,
    FREE_DAILY_LIMIT,
  };
};
