import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OwnedBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  order_method: 'whatsapp' | 'inbox' | 'external';
}

/**
 * Returns the brands the current user owns (via the brand_owners table).
 * Admins are NOT auto-included here — they have their own admin route.
 */
export const useBrandOwner = () => {
  const { user, loading: authLoading } = useAuth();
  const [brands, setBrands] = useState<OwnedBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setBrands([]);
          setLoading(false);
        }
        return;
      }

      // 1) Find ownership rows for this user
      const { data: ownerRows, error: ownerErr } = await (supabase.from('brand_owners') as any)
        .select('brand_id')
        .eq('user_id', user.id);

      if (ownerErr || !ownerRows || ownerRows.length === 0) {
        if (!cancelled) {
          setBrands([]);
          setLoading(false);
        }
        return;
      }

      const brandIds = ownerRows.map((r: any) => r.brand_id);

      // 2) Fetch the brands themselves (RLS allows owners to view their brand)
      const { data: brandRows } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url, order_method')
        .in('id', brandIds);

      if (!cancelled) {
        setBrands(((brandRows as OwnedBrand[]) || []).sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      }
    };

    if (!authLoading) load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { brands, loading: loading || authLoading, isBrandOwner: brands.length > 0 };
};
