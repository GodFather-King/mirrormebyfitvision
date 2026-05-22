
-- 1. Brand flags
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS ai_studio_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_studio_credits integer NOT NULL DEFAULT 0;

-- 2. ai_campaigns
CREATE TABLE IF NOT EXISTS public.ai_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  garment_image_url text NOT NULL,
  model_preset jsonb NOT NULL DEFAULT '{}'::jsonb,
  scene_preset text NOT NULL,
  aesthetic text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners view campaigns" ON public.ai_campaigns
  FOR SELECT TO authenticated
  USING (public.is_brand_owner(auth.uid(), brand_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand owners insert campaigns" ON public.ai_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.is_brand_owner(auth.uid(), brand_id) OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Brand owners update campaigns" ON public.ai_campaigns
  FOR UPDATE TO authenticated
  USING (public.is_brand_owner(auth.uid(), brand_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_brand_owner(auth.uid(), brand_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand owners delete campaigns" ON public.ai_campaigns
  FOR DELETE TO authenticated
  USING (public.is_brand_owner(auth.uid(), brand_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_campaigns_updated
  BEFORE UPDATE ON public.ai_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ai_campaign_images
CREATE TABLE IF NOT EXISTS public.ai_campaign_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ai_campaigns(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text,
  watermarked boolean NOT NULL DEFAULT false,
  variation_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_campaign_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view campaign images" ON public.ai_campaign_images
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_campaigns c
    WHERE c.id = ai_campaign_images.campaign_id
      AND (public.is_brand_owner(auth.uid(), c.brand_id) OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Owners insert campaign images" ON public.ai_campaign_images
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_campaigns c
    WHERE c.id = ai_campaign_images.campaign_id
      AND (public.is_brand_owner(auth.uid(), c.brand_id) OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Owners delete campaign images" ON public.ai_campaign_images
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_campaigns c
    WHERE c.id = ai_campaign_images.campaign_id
      AND (public.is_brand_owner(auth.uid(), c.brand_id) OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE INDEX IF NOT EXISTS idx_ai_campaigns_brand ON public.ai_campaigns(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_campaign_images_campaign ON public.ai_campaign_images(campaign_id);

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-studio', 'ai-studio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "AI studio public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ai-studio');

CREATE POLICY "AI studio authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-studio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "AI studio owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ai-studio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "AI studio owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ai-studio' AND auth.uid()::text = (storage.foldername(name))[1]);
