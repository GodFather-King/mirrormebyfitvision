
-- Extend brands table
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Allow public read of any approved brand (already exists). Keep that policy.

-- Extend brand_items so it can act as a marketplace item linked to a brand
ALTER TABLE public.brand_items
  ADD COLUMN IF NOT EXISTS linked_brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS is_marketplace boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- Public read for marketplace items belonging to approved brands
DROP POLICY IF EXISTS "Public can view marketplace items from approved brands" ON public.brand_items;
CREATE POLICY "Public can view marketplace items from approved brands"
ON public.brand_items
FOR SELECT
USING (
  is_marketplace = true
  AND linked_brand_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_items.linked_brand_id
      AND b.is_approved = true
  )
);

-- Tracking events table for marketplace analytics
CREATE TABLE IF NOT EXISTS public.brand_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  brand_id uuid,
  item_id uuid,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert brand events" ON public.brand_events;
CREATE POLICY "Anyone can insert brand events"
ON public.brand_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own brand events" ON public.brand_events;
CREATE POLICY "Users can view their own brand events"
ON public.brand_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_events_brand_id ON public.brand_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_events_event_type ON public.brand_events(event_type);
CREATE INDEX IF NOT EXISTS idx_brand_items_marketplace ON public.brand_items(linked_brand_id) WHERE is_marketplace = true;
