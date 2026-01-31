import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Loader2, Package } from 'lucide-react';

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
}

interface ProductGridProps {
  brandId: string;
  brandName: string;
  whatsappNumber: string;
  category: string;
  searchQuery: string;
}

const ProductGrid = ({ brandId, brandName, whatsappNumber, category, searchQuery }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [brandId]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brand_products')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No products found</h3>
        <p className="text-muted-foreground text-sm">
          {category !== 'all' ? `No ${category} available` : 'Check back soon for new items'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          brandName={brandName}
          whatsappNumber={whatsappNumber}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
