import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, ShoppingBag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BrandItem {
  id: string;
  brand_name: string;
  product_name: string | null;
  product_url: string | null;
  try_on_result_url: string | null;
  category: string;
  created_at: string;
}

const RecentlyTriedItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('brand_items')
        .select('id, brand_name, product_name, product_url, try_on_result_url, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setItems(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        Recently Tried
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {items.map((item) => (
          <div
            key={item.id}
            className="glass-card shrink-0 w-32 overflow-hidden flex flex-col"
          >
            {/* Preview image */}
            {item.try_on_result_url ? (
              <div className="aspect-[3/4] bg-muted/30 overflow-hidden">
                <img
                  src={item.try_on_result_url}
                  alt={item.product_name || item.brand_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-muted-foreground/40" />
              </div>
            )}

            {/* Info */}
            <div className="p-2 flex flex-col gap-1.5 flex-1">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                {item.brand_name}
              </span>
              <span className="text-xs text-foreground line-clamp-1">
                {item.product_name || item.category}
              </span>

              {item.product_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[10px] h-6 mt-auto gap-1"
                  onClick={() => window.open(item.product_url!, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                  Buy Now
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyTriedItems;
