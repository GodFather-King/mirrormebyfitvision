import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductDetailSheet from './ProductDetailSheet';

import type { Json } from '@/integrations/supabase/types';

interface Product {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string;
  category: string;
  available_sizes: string[];
  fit_type: string | null;
  fit_data: Json | null;
  additional_images?: string[] | null;
}

interface ProductCardProps {
  product: Product;
  brandName: string;
  whatsappNumber: string;
}

const ProductCard = ({ product, brandName, whatsappNumber }: ProductCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <>
      <div 
        className="glass-card overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
        onClick={() => setIsDetailOpen(true)}
      >
        {/* Product image */}
        <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
          
          {/* Try-on badge */}
          <div className="absolute top-2 right-2">
            <div className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="p-3 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {brandName}
          </p>
          <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-primary">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.fit_type && (
              <span className="text-xs text-muted-foreground capitalize">
                {product.fit_type} fit
              </span>
            )}
          </div>
        </div>
      </div>

      <ProductDetailSheet
        product={product}
        brandName={brandName}
        whatsappNumber={whatsappNumber}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
};

export default ProductCard;
