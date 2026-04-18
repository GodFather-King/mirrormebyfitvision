import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const FREE_TRYON_LIMIT = 5; // per week (Mon-Sun)
const FREE_SCAN_LIMIT = 2; // per week (Mon-Sun)

// Returns the most recent Monday at 00:00 local time
export const getWeekStartMonday = (now: Date = new Date()): Date => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const daysSinceMonday = (day + 6) % 7; // Mon=0, Sun=6
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
};

// Returns next Monday at 00:00 local time
export const getNextMonday = (now: Date = new Date()): Date => {
  const start = getWeekStartMonday(now);
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
};

export const useTryOnUsage = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [tryOnCount, setTryOnCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const effectivePlan = isAdmin ? 'premium' : currentPlan;
  const isFreePlan = effectivePlan === 'free';
  const baseTryOnRemaining = Math.max(0, FREE_TRYON_LIMIT - tryOnCount);
  const tryOnRemaining = isAdmin ? Infinity : baseTryOnRemaining + Math.max(0, bonusCredits);
  const scanRemaining = isAdmin ? Infinity : Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const isAtLimit = isFreePlan && tryOnCount >= FREE_TRYON_LIMIT && bonusCredits <= 0;
  const isAtScanLimit = isFreePlan && scanCount >= FREE_SCAN_LIMIT;

  // Keep backward-compatible aliases (dailyCount now reflects weekly try-on count)
  const remaining = tryOnRemaining;
  const dailyCount = tryOnCount;

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Both try-ons and scans use the current ISO week (Mon 00:00 -> next Mon 00:00)
    const weekStart = getWeekStartMonday();

    const [tryOnRes, scanRes, subRes, bonusRes] = await Promise.all([
      supabase
        .from('try_on_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('usage_type', 'try_on')
        .gte('used_at', weekStart.toISOString()),
      supabase
        .from('try_on_usage')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('usage_type', 'scan')
        .gte('used_at', weekStart.toISOString()),
      supabase
        .from('subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('bonus_credits')
        .select('amount')
        .eq('user_id', user.id),
    ]);

    setTryOnCount(tryOnRes.count ?? 0);
    setScanCount(scanRes.count ?? 0);
    const total = (bonusRes.data ?? []).reduce((sum, r: { amount: number }) => sum + (r.amount ?? 0), 0);
    setBonusCredits(total);

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

    // If base weekly free try-ons are exhausted and the user has bonus credits, consume one
    if (isFreePlan && tryOnCount >= FREE_TRYON_LIMIT && bonusCredits > 0) {
      await supabase.from('bonus_credits').insert({
        user_id: user.id,
        amount: -1,
        reason: 'consumed',
      });
      setBonusCredits(prev => prev - 1);
    }
    setTryOnCount(prev => prev + 1);
  }, [user, isFreePlan, tryOnCount, bonusCredits]);

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
    bonusCredits,
    isFreePlan,
    isAtLimit,
    isAtScanLimit,
    currentPlan: effectivePlan,
    loading,
    recordUsage,
    recordScanUsage,
    refreshUsage: fetchUsage,
    nextResetAt: getNextMonday(),
    FREE_DAILY_LIMIT: FREE_TRYON_LIMIT,
    FREE_TRYON_LIMIT,
    FREE_SCAN_LIMIT,
  };
};
