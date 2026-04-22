-- 1. Brand owners table
CREATE TABLE public.brand_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);

CREATE INDEX idx_brand_owners_user ON public.brand_owners(user_id);
CREATE INDEX idx_brand_owners_brand ON public.brand_owners(brand_id);

ALTER TABLE public.brand_owners ENABLE ROW LEVEL SECURITY;

-- Security definer helper: is this user an owner of this brand?
CREATE OR REPLACE FUNCTION public.is_brand_owner(_user_id uuid, _brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_owners
    WHERE user_id = _user_id AND brand_id = _brand_id
  )
$$;

-- RLS for brand_owners
CREATE POLICY "Admins manage brand owners"
  ON public.brand_owners FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can see their own ownership rows"
  ON public.brand_owners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Add delivery fields to brand_orders
ALTER TABLE public.brand_orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_street TEXT,
  ADD COLUMN IF NOT EXISTS delivery_area TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT;

-- 3. Brand owner access to their orders
CREATE POLICY "Brand owners can view their orders"
  ON public.brand_orders FOR SELECT
  TO authenticated
  USING (public.is_brand_owner(auth.uid(), brand_id));

CREATE POLICY "Brand owners can update their orders"
  ON public.brand_orders FOR UPDATE
  TO authenticated
  USING (public.is_brand_owner(auth.uid(), brand_id))
  WITH CHECK (public.is_brand_owner(auth.uid(), brand_id));

-- 4. Brand owner access to their brand record (manage their store info)
CREATE POLICY "Brand owners can view their brand"
  ON public.brands FOR SELECT
  TO authenticated
  USING (public.is_brand_owner(auth.uid(), id));

CREATE POLICY "Brand owners can update their brand"
  ON public.brands FOR UPDATE
  TO authenticated
  USING (public.is_brand_owner(auth.uid(), id))
  WITH CHECK (public.is_brand_owner(auth.uid(), id));

-- 5. Brand owner access to their items
CREATE POLICY "Brand owners can view their brand items"
  ON public.brand_items FOR SELECT
  TO authenticated
  USING (
    linked_brand_id IS NOT NULL
    AND public.is_brand_owner(auth.uid(), linked_brand_id)
  );