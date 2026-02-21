
-- Add brand_names and product_links columns to saved_outfits
ALTER TABLE public.saved_outfits
  ADD COLUMN brand_names text[] DEFAULT '{}',
  ADD COLUMN product_links jsonb DEFAULT '[]';
