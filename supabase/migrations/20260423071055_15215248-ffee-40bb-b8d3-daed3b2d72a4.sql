
-- 1. Storage bucket for persisted try-on images
INSERT INTO storage.buckets (id, name, public)
VALUES ('try-ons', 'try-ons', true)
ON CONFLICT (id) DO NOTHING;

-- Public read; users can write/update/delete only their own folder
CREATE POLICY "Try-on images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'try-ons');

CREATE POLICY "Users can upload their own try-on images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'try-ons'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own try-on images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'try-ons'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own try-on images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'try-ons'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. History table linking each try-on image to its owner + source item
CREATE TABLE public.try_on_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  source TEXT NOT NULL DEFAULT 'brand_store',
  brand_id UUID,
  brand_item_id UUID,
  item_name TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.try_on_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own try-on history"
ON public.try_on_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own try-on history"
ON public.try_on_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own try-on history"
ON public.try_on_history FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_try_on_history_user_created
  ON public.try_on_history (user_id, created_at DESC);

CREATE INDEX idx_try_on_history_item
  ON public.try_on_history (user_id, brand_item_id);
