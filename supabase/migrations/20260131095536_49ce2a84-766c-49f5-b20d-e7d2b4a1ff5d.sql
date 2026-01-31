-- Create brands table for partner brands
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  whatsapp_number TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_products table for clothing inventory
CREATE TABLE public.brand_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  available_sizes TEXT[] NOT NULL DEFAULT '{}',
  fit_type TEXT DEFAULT 'regular',
  fit_data JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for brands (public read for approved brands)
CREATE POLICY "Anyone can view approved brands"
ON public.brands
FOR SELECT
USING (is_approved = true);

-- RLS policies for brand products (public read for active products of approved brands)
CREATE POLICY "Anyone can view active products from approved brands"
ON public.brand_products
FOR SELECT
USING (
  is_active = true AND 
  EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND is_approved = true)
);

-- Create indexes for performance
CREATE INDEX idx_brands_slug ON public.brands(slug);
CREATE INDEX idx_brands_approved ON public.brands(is_approved);
CREATE INDEX idx_brand_products_brand_id ON public.brand_products(brand_id);
CREATE INDEX idx_brand_products_category ON public.brand_products(category);

-- Create updated_at trigger for brands
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for brand_products
CREATE TRIGGER update_brand_products_updated_at
BEFORE UPDATE ON public.brand_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();