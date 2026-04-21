
-- 1) Add order_method to brands and relax whatsapp_number
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS order_method text NOT NULL DEFAULT 'whatsapp'
    CHECK (order_method IN ('whatsapp', 'inbox'));

ALTER TABLE public.brands
  ALTER COLUMN whatsapp_number DROP NOT NULL;

-- 2) brand_orders table
CREATE TABLE IF NOT EXISTS public.brand_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.brand_items(id) ON DELETE SET NULL,
  customer_user_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  size text,
  message text,
  try_on_image_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_orders_brand_id ON public.brand_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_orders_customer_user_id ON public.brand_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_orders_status ON public.brand_orders(status);

ALTER TABLE public.brand_orders ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can place an order
CREATE POLICY "Anyone can place orders"
  ON public.brand_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.brand_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all orders (status changes)
CREATE POLICY "Admins can update all orders"
  ON public.brand_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete orders
CREATE POLICY "Admins can delete orders"
  ON public.brand_orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Customers can view their own orders
CREATE POLICY "Customers can view their own orders"
  ON public.brand_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_brand_orders_updated_at ON public.brand_orders;
CREATE TRIGGER update_brand_orders_updated_at
  BEFORE UPDATE ON public.brand_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_orders;
