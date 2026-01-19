-- Create clothing categories enum
CREATE TYPE public.clothing_category AS ENUM ('tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories');

-- Create wardrobe_items table
CREATE TABLE public.wardrobe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category clothing_category NOT NULL,
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT,
  color TEXT,
  tags TEXT[],
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wardrobe_items
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Wardrobe items policies
CREATE POLICY "Users can view their own wardrobe items" 
ON public.wardrobe_items FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wardrobe items" 
ON public.wardrobe_items FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wardrobe items" 
ON public.wardrobe_items FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wardrobe items" 
ON public.wardrobe_items FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for wardrobe
INSERT INTO storage.buckets (id, name, public) VALUES ('wardrobe', 'wardrobe', true);

-- Storage policies for wardrobe bucket
CREATE POLICY "Wardrobe images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'wardrobe');

CREATE POLICY "Users can upload their own wardrobe items" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own wardrobe items" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own wardrobe items" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create saved_outfits table for mix & match
CREATE TABLE public.saved_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  items UUID[] NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on saved_outfits
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;

-- Saved outfits policies
CREATE POLICY "Users can view their own outfits" 
ON public.saved_outfits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own outfits" 
ON public.saved_outfits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits" 
ON public.saved_outfits FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits" 
ON public.saved_outfits FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for wardrobe_items timestamp
CREATE TRIGGER update_wardrobe_items_updated_at
BEFORE UPDATE ON public.wardrobe_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();