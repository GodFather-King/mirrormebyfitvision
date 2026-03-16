import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const FREE_TRYON_LIMIT = 3;
const FREE_SCAN_LIMIT = 2;

export const useTryOnUsage = () => {
  const { user } = useAuth();
  const [tryOnCount, setTryOnCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const isFreePlan = currentPlan === 'free';
  const tryOnRemaining = Math.max(0, FREE_TRYON_LIMIT - tryOnCount);
  const scanRemaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const isAtLimit = isFreePlan && tryOnCount >= FREE_TRYON_LIMIT;
  const isAtScanLimit = isFreePlan && scanCount >= FREE_SCAN_LIMIT;

  // Keep backward-compatible aliases
  const remaining = tryOnRemaining;
  const dailyCount = tryOnCount;

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [tryOnRes, scanRes, subRes] = await Promise.all([
      supabase
        .from('try_on_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('usage_type', 'try_on')
        .gte('used_at', todayStart.toISOString()),
      supabase
        .from('try_on_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('usage_type', 'scan')
        .gte('used_at', todayStart.toISOString()),
      supabase
        .from('subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    setTryOnCount(tryOnRes.count ?? 0);
    setScanCount(scanRes.count ?? 0);

    if (subRes.data && subRes.data.status === 'active') {
      if (subRes.data.expires_at && new Date(subRes.data.expires_at) < new Date()) {
        setCurrentPlan('free');
        supabase.functions.invoke('expire-subscriptions').catch(() => {});
      } else {
        setCurrentPlan(subRes.data.plan);
      }
    } else if (subRes.data && subRes.data.status === 'expired') {
      setCurrentPlan('free');
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
      usage_type: 'try_on',
    });
    setTryOnCount(prev => prev + 1);
  }, [user]);

  const recordScanUsage = useCallback(async (itemId?: string) => {
    if (!user) return;
    await supabase.from('try_on_usage').insert({
      user_id: user.id,
      item_id: itemId || null,
      usage_type: 'scan',
    });
    setScanCount(prev => prev + 1);
  }, [user]);

  return {
    dailyCount,
    remaining,
    tryOnRemaining,
    scanRemaining,
    scanCount,
    isFreePlan,
    isAtLimit,
    isAtScanLimit,
    currentPlan,
    loading,
    recordUsage,
    recordScanUsage,
    refreshUsage: fetchUsage,
    FREE_DAILY_LIMIT: FREE_TRYON_LIMIT,
    FREE_TRYON_LIMIT,
    FREE_SCAN_LIMIT,
  };
};
