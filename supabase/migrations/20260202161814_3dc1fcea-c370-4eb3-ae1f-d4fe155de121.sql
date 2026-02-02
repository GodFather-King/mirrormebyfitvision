-- Add column for additional product images
ALTER TABLE public.brand_products 
ADD COLUMN additional_images text[] DEFAULT '{}'::text[];