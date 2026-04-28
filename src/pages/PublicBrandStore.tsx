import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  ShoppingBag,
  Sparkles,
  Store,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logBrandEvent } from '@/lib/brandEvents';
import InlineTryOnDialog from '@/components/local-brands/InlineTryOnDialog';
import OrderDialog from '@/components/store/OrderDialog';
import SignupPromptDialog from '@/components/store/SignupPromptDialog';
import { useAuth } from '@/hooks/useAuth';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_verified: boolean;
  whatsapp_number: string | null;
  order_method: 'whatsapp' | 'inbox' | 'external';
  external_website_url: string | null;
}

interface Item {
  id: string;
  product_name: string | null;
  product_image: string;
  category: string;
  price: number | null;
  currency: string | null;
  external_url: string | null;
}

const PublicBrandStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [tryOnItem, setTryOnItem] = useState<Item | null>(null);
  const [orderItem, setOrderItem] = useState<Item | null>(null);
  const [signupPromptOpen, setSignupPromptOpen] = useState(false);
  // Latest try-on result keyed by item id, so the order dialog can attach it.
  const [tryOnByItem, setTryOnByItem] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);

      const { data: brandData, error: brandErr } = await (supabase.from('brands') as any)
        .select('id, name, slug, description, logo_url, cover_image_url, location, is_verified, whatsapp_number, order_method, external_website_url')
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
        .select('id, product_name, product_image, category, price, currency, external_url')
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
    if (!user) {
      logBrandEvent({ eventType: 'try_on_signup_prompt', brandId: brand.id, itemId: item.id });
      setSignupPromptOpen(true);
      return;
    }
    logBrandEvent({ eventType: 'try_on_clicked', brandId: brand.id, itemId: item.id });
    logBrandEvent({ eventType: 'item_viewed', brandId: brand.id, itemId: item.id });
    setTryOnItem(item);
  };

  const handleOrder = (item: Item) => {
    if (!brand) return;
    // Hard requirement: must have a try-on for this specific item
    if (!tryOnByItem[item.id]) {
      toast.error('You must try on this item before ordering');
      setTryOnItem(item);
      return;
    }
    logBrandEvent({ eventType: 'order_clicked', brandId: brand.id, itemId: item.id });
    setOrderItem(item);
  };

  const handleShare = async () => {
    if (!brand) return;
    const url = `${window.location.origin}/store/${brand.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: brand.name, text: `Shop ${brand.name} on MirrorMe`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Store link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Store className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="font-medium">Store not found</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/local-brands')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Browse brands
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone storefront top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="w-8 h-8 rounded-full object-cover bg-muted shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate flex items-center gap-1">
                {brand.name}
                {brand.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">mirrorme.app/store/{brand.slug}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={handleShare} title="Share store">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 pb-12 space-y-6">
        {/* Brand header card */}
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
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold">Shop</h2>
            <span className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</span>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No items yet from this brand.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {items.map((item) => (
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
                      <Button size="sm" variant="glass" className="h-8 text-xs" onClick={() => handleOrder(item)}>
                        <ShoppingBag className="w-3 h-3 mr-1" /> I want this
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-8 pb-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by <span className="font-semibold">MirrorMe</span> — Try clothes on virtually
          </button>
        </footer>
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
        brand={brand ? { id: brand.id, name: brand.name, whatsapp_number: brand.whatsapp_number || '' } : null}
        onTryOnReady={(url) => {
          if (tryOnItem) setTryOnByItem((prev) => ({ ...prev, [tryOnItem.id]: url }));
        }}
        onWhatsApp={() => tryOnItem && handleOrder(tryOnItem)}
      />

      <OrderDialog
        open={!!orderItem}
        onOpenChange={(o) => !o && setOrderItem(null)}
        brand={brand}
        item={
          orderItem
            ? { id: orderItem.id, name: orderItem.product_name || 'Item', category: orderItem.category }
            : null
        }
        tryOnImageUrl={orderItem ? tryOnByItem[orderItem.id] || null : null}
      />

      <SignupPromptDialog open={signupPromptOpen} onOpenChange={setSignupPromptOpen} />
    </div>
  );
};

export default PublicBrandStore;
