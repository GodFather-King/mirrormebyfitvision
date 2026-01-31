import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import BrandCard from '@/components/shop/BrandCard';
import ProductGrid from '@/components/shop/ProductGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Store, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  whatsapp_number: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '✨' },
  { value: 'tops', label: 'Tops', emoji: '👕' },
  { value: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { value: 'dresses', label: 'Dresses', emoji: '👗' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'accessories', label: 'Accessories', emoji: '👜' },
];

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('shop');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
    } else {
      setBrands(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative pt-20 pb-32 px-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {selectedBrand ? (
            <Button variant="ghost" size="icon" onClick={() => setSelectedBrand(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl gradient-text">
              {selectedBrand ? selectedBrand.name : 'Brand Shop'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {selectedBrand ? 'Browse collection' : `${brands.length} partner brands`}
            </p>
          </div>
          <Store className="w-6 h-6 text-primary" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={selectedBrand ? "Search products..." : "Search brands..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-border/50"
          />
        </div>

        {selectedBrand ? (
          <>
            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'secondary'}
                  className={`
                    cursor-pointer shrink-0 px-3 py-1.5 text-sm transition-colors
                    ${selectedCategory === cat.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                    }
                  `}
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.emoji} {cat.label}
                </Badge>
              ))}
            </div>

            {/* Products */}
            <ProductGrid 
              brandId={selectedBrand.id}
              brandName={selectedBrand.name}
              whatsappNumber={selectedBrand.whatsapp_number}
              category={selectedCategory}
              searchQuery={searchQuery}
            />
          </>
        ) : (
          <>
            {/* Brand list */}
            {brands.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No brands yet</h3>
                <p className="text-muted-foreground text-sm">
                  Partner brands will appear here soon
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {brands
                  .filter(brand => 
                    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((brand) => (
                    <BrandCard
                      key={brand.id}
                      brand={brand}
                      onClick={() => setSelectedBrand(brand)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Shop;
