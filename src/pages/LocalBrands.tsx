import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, MapPin, BadgeCheck, Search, Flame, Sparkles, ArrowRight } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_verified: boolean;
  is_featured: boolean;
  whatsapp_number: string;
  created_at: string;
}

interface MarketItem {
  id: string;
  brand_name: string;
  product_name: string | null;
  product_image: string;
  category: string;
  price: number | null;
  currency: string | null;
  click_count: number | null;
  linked_brand_id: string | null;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'tops', label: 'Tops' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'dresses', label: 'Dresses' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accessories', label: 'Accessories' },
];

const LocalBrands = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [trending, setTrending] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [brandsRes, itemsRes] = await Promise.all([
        (supabase.from('brands') as any)
          .select('*')
          .eq('is_approved', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false }),
        (supabase.from('brand_items') as any)
          .select('id, brand_name, product_name, product_image, category, price, currency, click_count, linked_brand_id')
          .eq('is_marketplace', true)
          .order('click_count', { ascending: false })
          .limit(8),
      ]);
      if (!brandsRes.error && brandsRes.data) setBrands(brandsRes.data as Brand[]);
      if (!itemsRes.error && itemsRes.data) setTrending(itemsRes.data as MarketItem[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter(b =>
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q) ||
      (b.location || '').toLowerCase().includes(q),
    );
  }, [brands, search]);

  const featured = filtered.filter(b => b.is_featured);
  const newest = [...filtered]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-8">
        {/* Hero */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Local Brands</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover local fashion brands. Try on items virtually, then order via WhatsApp.
          </p>
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands or locations…"
            className="pl-9"
          />
        </div>

        {/* Categories */}
        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Categories
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {CATEGORIES.map(c => (
              <Button
                key={c.key}
                variant={activeCategory === c.key ? 'default' : 'glass'}
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => setActiveCategory(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Featured */}
        {(featured.length > 0 || loading) && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Featured Brands
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 w-64 shrink-0 rounded-lg" />
                  ))
                : featured.map(b => (
                    <BrandCard key={b.id} brand={b} variant="featured" onOpen={() => navigate(`/store/${b.slug}`)} />
                  ))}
            </div>
          </section>
        )}

        {/* New brands */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> New Brands
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          ) : newest.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {newest.map(b => (
                <BrandCard key={b.id} brand={b} onOpen={() => navigate(`/store/${b.slug}`)} />
              ))}
            </div>
          )}
        </section>

        {/* Trending Items */}
        {trending.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Trending Items
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trending
                .filter(t => activeCategory === 'all' || t.category === activeCategory)
                .map(item => {
                  const brand = brands.find(b => b.id === item.linked_brand_id);
                  return (
                    <Card
                      key={item.id}
                      className="overflow-hidden cursor-pointer group"
                      onClick={() => brand && navigate(`/store/${brand.slug}`)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={item.product_image}
                          alt={item.product_name || 'Item'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-medium truncate">{item.product_name || 'Unnamed'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.brand_name}</p>
                        {item.price != null && (
                          <p className="text-xs font-semibold text-primary">
                            {item.currency || 'ZAR'} {Number(item.price).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </section>
        )}
      </main>

      <BottomNavigation activeTab="local-brands" onTabChange={() => {}} />
    </div>
  );
};

const BrandCard = ({
  brand,
  onOpen,
  variant,
}: {
  brand: Brand;
  onOpen: () => void;
  variant?: 'featured';
}) => {
  const isFeatured = variant === 'featured';
  return (
    <Card
      onClick={onOpen}
      className={
        'overflow-hidden cursor-pointer group snap-start ' +
        (isFeatured ? 'w-64 shrink-0' : '')
      }
    >
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        {brand.cover_image_url ? (
          <img
            src={brand.cover_image_url}
            alt={brand.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : brand.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
            <img
              src={brand.logo_url}
              alt={brand.name}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Store className="w-10 h-10 text-primary/50" />
          </div>
        )}
        {brand.is_verified && (
          <Badge className="absolute top-2 right-2 gap-1">
            <BadgeCheck className="w-3 h-3" /> Verified
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          {brand.logo_url && (
            <img src={brand.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
          )}
          <h3 className="font-semibold text-sm truncate flex-1">{brand.name}</h3>
        </div>
        {brand.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{brand.description}</p>
        )}
        {brand.location && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {brand.location}
          </p>
        )}
        <Button size="sm" variant="ghost" className="w-full justify-between mt-1 h-8 px-2">
          View Store <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};

const EmptyState = () => (
  <div className="text-center py-12 border border-dashed rounded-lg">
    <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm font-medium">No brands yet</p>
    <p className="text-xs text-muted-foreground mt-1">
      Local brands will appear here once they're approved.
    </p>
  </div>
);

export default LocalBrands;
