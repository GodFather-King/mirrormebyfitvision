-- Add clothing measurement columns and fit_type to wardrobe_items
ALTER TABLE public.wardrobe_items 
  ADD COLUMN IF NOT EXISTS chest_width_cm numeric,
  ADD COLUMN IF NOT EXISTS waist_width_cm numeric,
  ADD COLUMN IF NOT EXISTS hip_width_cm numeric,
  ADD COLUMN IF NOT EXISTS sleeve_length_cm numeric,
  ADD COLUMN IF NOT EXISTS shoulder_width_cm numeric,
  ADD COLUMN IF NOT EXISTS garment_length_cm numeric,
  ADD COLUMN IF NOT EXISTS fit_type text DEFAULT 'regular' CHECK (fit_type IN ('tight', 'regular', 'oversized'));
