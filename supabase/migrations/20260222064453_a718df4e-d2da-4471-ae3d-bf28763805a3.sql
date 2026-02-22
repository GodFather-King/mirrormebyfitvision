
-- Table to store external brand product references
CREATE TABLE public.brand_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  product_name TEXT,
  product_image TEXT NOT NULL,
  product_url TEXT,
  category TEXT NOT NULL DEFAULT 'tops',
  try_on_result_url TEXT,
  linked_outfit_id UUID REFERENCES public.saved_outfits(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand items"
  ON public.brand_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand items"
  ON public.brand_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand items"
  ON public.brand_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand items"
  ON public.brand_items FOR DELETE
  USING (auth.uid() = user_id);
