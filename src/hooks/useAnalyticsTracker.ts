import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const getSessionId = (): string => {
  let sid = sessionStorage.getItem('mm_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('mm_sid', sid);
  }
  return sid;
};

export const useAnalyticsTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastPath = useRef('');

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    supabase.from('page_views').insert([{
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      page_path: path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    }]).then(() => {});
  }, [location.pathname, user]);
};
