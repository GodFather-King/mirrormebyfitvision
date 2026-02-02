import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BrandProduct {
  id: string;
  name: string;
  brand_name: string;
  price: number;
  currency: string;
  image_url: string;
  category: string;
  fit_type: string | null;
}

interface ClothingCarouselProps {
  onSelect: (item: BrandProduct | null) => void;
  selectedId: string | null;
  isApplyingClothing?: boolean;
}

const ClothingCarousel = ({ onSelect, selectedId, isApplyingClothing = false }: ClothingCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBrandProducts();
  }, []);

  const fetchBrandProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('brand_products')
      .select(`
        id, name, price, currency, image_url, category, fit_type,
        brands!inner(name, is_approved)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching brand products:', error);
    } else {
      const productsWithBrand = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        brand_name: p.brands?.name || 'Partner Brand',
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        category: p.category,
        fit_type: p.fit_type,
      }));
      setProducts(productsWithBrand);
    }
    setIsLoading(false);
  };

  const nextSlide = () => {
    if (products.length > 0) {
      setActiveIndex((prev) => (prev + 1) % products.length);
    }
  };

  const prevSlide = () => {
    if (products.length > 0) {
      setActiveIndex((prev) => (prev - 1 + products.length) % products.length);
    }
  };

  const getFitLabel = (fitType: string | null) => {
    switch (fitType) {
      case 'slim': return { label: 'Slim Fit', color: 'text-blue-400 bg-blue-400/10' };
      case 'regular': return { label: 'Regular Fit', color: 'text-green-400 bg-green-400/10' };
      case 'relaxed': return { label: 'Relaxed Fit', color: 'text-yellow-400 bg-yellow-400/10' };
      default: return { label: 'Standard Fit', color: 'text-muted-foreground bg-muted/30' };
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ZAR') return `R${price.toLocaleString()}`;
    if (currency === 'USD') return `$${price.toLocaleString()}`;
    return `${currency} ${price.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No partner products available yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-secondary" />
          <h3 className="font-display font-semibold text-sm">Partner Brands</h3>
        </div>
        <div className="flex items-center gap-2">
          {isApplyingClothing && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Fitting...
            </span>
          )}
          <span className="text-xs text-muted-foreground">{products.length} items</span>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 overflow-hidden">
          {products.map((item, index) => (
            <div
              key={item.id}
              className={`flex-shrink-0 w-full transition-all duration-500 ${
                index === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
              }`}
            >
              <div 
                className={`relative glass-card p-3 cursor-pointer transition-all duration-300 ${
                  selectedId === item.id ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
                } ${isApplyingClothing ? 'pointer-events-none opacity-70' : ''}`}
                onClick={() => !isApplyingClothing && onSelect(selectedId === item.id ? null : item)}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted/30 mb-3 relative">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedId === item.id && isApplyingClothing && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{item.brand_name}</p>
                  <p className="font-medium text-sm">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-primary">
                      {formatPrice(item.price, item.currency)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getFitLabel(item.fit_type).color}`}>
                      {getFitLabel(item.fit_type).label}
                    </span>
                  </div>
                </div>

                {selectedId === item.id && !isApplyingClothing && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        {products.length > 1 && (
          <>
            <button 
              onClick={prevSlide}
              disabled={isApplyingClothing}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 glass-card rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextSlide}
              disabled={isApplyingClothing}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 glass-card rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {products.length > 1 && (
        <div className="flex justify-center gap-2">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => !isApplyingClothing && setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === activeIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Try-on hint */}
      {!selectedId && (
        <p className="text-xs text-center text-muted-foreground">
          Tap an item to try it on your avatar
        </p>
      )}
    </div>
  );
};

export default ClothingCarousel;
