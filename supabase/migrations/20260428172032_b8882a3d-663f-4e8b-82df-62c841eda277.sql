-- Add support for external website store mode
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS external_website_url text;

-- Allow 'external' as a valid order_method (no constraint exists, just documenting)
-- Existing values: 'whatsapp' | 'inbox' | now 'external'

-- Per-product external purchase URL
ALTER TABLE public.brand_items
  ADD COLUMN IF NOT EXISTS external_url text;