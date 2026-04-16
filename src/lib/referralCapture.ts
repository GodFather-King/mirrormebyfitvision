import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'mirrorme_pending_ref';

/** Read ?ref= from current URL and persist it for later redemption. */
export const captureRefFromUrl = () => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && ref.length >= 4 && ref.length <= 20) {
    try {
      localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
    } catch {
      // ignore
    }
  }
};

export const getPendingRef = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const clearPendingRef = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/**
 * After auth, attempt to record the referral link between the new user and the referrer.
 * Safe to call repeatedly — the referrals.referred_id UNIQUE constraint prevents dupes.
 */
export const redeemPendingReferral = async (userId: string): Promise<boolean> => {
  const code = getPendingRef();
  if (!code) return false;

  // Look up referrer by code
  const { data: codeRow } = await supabase
    .from('referral_codes')
    .select('user_id, code')
    .eq('code', code)
    .maybeSingle();

  if (!codeRow || codeRow.user_id === userId) {
    clearPendingRef();
    return false;
  }

  // Check if this user already has a referral row
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', userId)
    .maybeSingle();

  if (existing) {
    clearPendingRef();
    return false;
  }

  const { error } = await supabase.from('referrals').insert({
    referrer_id: codeRow.user_id,
    referred_id: userId,
    code: codeRow.code,
    status: 'pending',
  });

  if (!error) clearPendingRef();
  return !error;
};
