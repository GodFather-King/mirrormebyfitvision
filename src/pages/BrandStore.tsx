import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BadgeCheck, MapPin, MessageCircle, Sparkles, Store } from 'lucide-react';
import { logBrandEvent } from '@/lib/brandEvents';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import InlineTryOnDialog from '@/components/local-brands/InlineTryOnDialog';
import { useMeasurements } from '@/hooks/useMeasurements';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_verified: boolean;
  whatsapp_number: string;
}

interface Item {
  id: string;
  product_name: string | null;
  product_image: string;
  category: string;
  price: number | null;
  currency: string | null;
}

const BrandStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getRecommendedSize } = useMeasurements();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tryOnItem, setTryOnItem] = useState<Item | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      const { data: brandData, error: brandErr } = await (supabase.from('brands') as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_approved', true)
        .maybeSingle();

      if (brandErr || !brandData) {
        setBrand(null);
        setItems([]);
        setLoading(false);
        return;
      }

      setBrand(brandData as Brand);
      logBrandEvent({ eventType: 'brand_viewed', brandId: brandData.id });

      const { data: itemsData } = await (supabase.from('brand_items') as any)
        .select('id, product_name, product_image, category, price, currency')
        .eq('linked_brand_id', brandData.id)
        .eq('is_marketplace', true)
        .order('created_at', { ascending: false });

      if (itemsData) setItems(itemsData as Item[]);
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleTryOn = (item: Item) => {
    if (!brand) return;
    logBrandEvent({ eventType: 'try_on_clicked', brandId: brand.id, itemId: item.id });
    logBrandEvent({ eventType: 'item_viewed', brandId: brand.id, itemId: item.id });
    setTryOnItem(item);
  };

  const handleWhatsApp = (item: Item) => {
    if (!brand) return;
    const recommendedSize = getRecommendedSize?.(item.category, ['XS', 'S', 'M', 'L', 'XL'])?.size ?? null;
    const message = buildOrderMessage({
      itemName: item.product_name || 'this item',
      recommendedSize,
    });
    logBrandEvent({
      eventType: 'whatsapp_order_clicked',
      brandId: brand.id,
      itemId: item.id,
      metadata: { recommendedSize },
    });
    window.open(buildWhatsAppUrl(brand.whatsapp_number, message), '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="max-w-6xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
        <BottomNavigation activeTab="local-brands" onTabChange={() => {}} />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="max-w-6xl mx-auto px-4 pt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/local-brands')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Brand not found</p>
          </div>
        </main>
        <BottomNavigation activeTab="local-brands" onTabChange={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-4 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/local-brands')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Local Brands
        </Button>

        {/* Brand header */}
        <Card className="overflow-hidden">
          <div className="aspect-[3/1] md:aspect-[5/1] bg-muted relative">
            {brand.cover_image_url ? (
              <img src={brand.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : brand.logo_url ? (
              <div className="w-full h-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center p-6">
                <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-[40%] object-contain" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 to-secondary/20" />
            )}
          </div>
          <div className="p-4 flex items-start gap-4">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="w-16 h-16 rounded-full border-2 border-background -mt-12 object-cover bg-muted"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted -mt-12 border-2 border-background flex items-center justify-center">
                <Store className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{brand.name}</h1>
                {brand.is_verified && (
                  <Badge className="gap-1">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>
              {brand.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {brand.location}
                </p>
              )}
              {brand.description && (
                <p className="text-sm text-muted-foreground mt-2">{brand.description}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Items grid */}
        <section>
          <h2 className="text-lg font-bold mb-3">Items</h2>
          {items.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No items yet from this brand.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {items.map(item => (
                <Card key={item.id} className="overflow-hidden flex flex-col">
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={item.product_image}
                      alt={item.product_name || 'Item'}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                    <p className="text-sm font-medium truncate">{item.product_name || 'Unnamed'}</p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.category}
                      </Badge>
                      {item.price != null && (
                        <span className="text-xs font-semibold text-primary">
                          {item.currency || 'ZAR'} {Number(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-auto pt-1.5">
                      <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => handleTryOn(item)}>
                        <Sparkles className="w-3 h-3 mr-1" /> Try On
                      </Button>
                      <Button size="sm" variant="glass" className="h-8 text-xs" onClick={() => handleWhatsApp(item)}>
                        <MessageCircle className="w-3 h-3 mr-1" /> Order
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <InlineTryOnDialog
        open={!!tryOnItem}
        onOpenChange={(o) => !o && setTryOnItem(null)}
        item={
          tryOnItem
            ? {
                id: tryOnItem.id,
                name: tryOnItem.product_name || 'Item',
                image_url: tryOnItem.product_image,
                category: tryOnItem.category,
              }
            : null
        }
        brand={brand ? { id: brand.id, name: brand.name, whatsapp_number: brand.whatsapp_number } : null}
        onWhatsApp={() => tryOnItem && handleWhatsApp(tryOnItem)}
      />

      <BottomNavigation activeTab="local-brands" onTabChange={() => {}} />
    </div>
  );
};

export default BrandStore;
