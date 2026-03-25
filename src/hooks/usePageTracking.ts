import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  window.gtag?.('event', eventName, params);
};

/** Track user engagement after signup — fires once per session for new users */
export const trackPostSignupEngagement = (action: string) => {
  const key = 'mirrorme_first_action_tracked';
  if (sessionStorage.getItem(key)) return;
  
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user) return;
    const createdAt = new Date(session.user.created_at);
    const hoursSinceSignup = (Date.now() - createdAt.getTime()) / 3600000;
    // Only track if user signed up within the last 24 hours
    if (hoursSinceSignup <= 24) {
      trackEvent('post_signup_engagement', { action, hours_since_signup: Math.round(hoursSinceSignup) });
      sessionStorage.setItem(key, '1');
    }
  });
};

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    window.gtag?.('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location]);
};
