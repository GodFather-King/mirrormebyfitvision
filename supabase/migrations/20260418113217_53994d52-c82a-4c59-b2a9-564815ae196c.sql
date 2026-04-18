
-- Tighten admin INSERT policies (replace WITH CHECK (true) style)
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
CREATE POLICY "Admins can insert brands"
ON public.brands FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert any brand items" ON public.brand_items;
CREATE POLICY "Admins can insert any brand items"
ON public.brand_items FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage: remove broad SELECT, files are still served publicly via public URL,
-- but bucket listing is restricted to admins
DROP POLICY IF EXISTS "Public can view brand assets" ON storage.objects;

DROP POLICY IF EXISTS "Admins can list brand assets" ON storage.objects;
CREATE POLICY "Admins can list brand assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
