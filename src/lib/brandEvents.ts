import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/hooks/usePageTracking';

export type BrandEventType =
  | 'brand_viewed'
  | 'item_viewed'
  | 'try_on_clicked'
  | 'try_on_signup_prompt'
  | 'order_clicked'
  | 'whatsapp_order_clicked'
  | 'inbox_order_placed';

interface LogParams {
  eventType: BrandEventType;
  brandId?: string | null;
  itemId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget: log event to brand_events table + GA. */
export const logBrandEvent = async ({ eventType, brandId, itemId, metadata }: LogParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    trackEvent(eventType, { brand_id: brandId, item_id: itemId, ...metadata });
    await (supabase.from('brand_events') as any).insert({
      event_type: eventType,
      brand_id: brandId ?? null,
      item_id: itemId ?? null,
      user_id: user?.id ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Tracking should never block the user.
    console.warn('[brandEvents] failed to log', eventType, err);
  }
};
