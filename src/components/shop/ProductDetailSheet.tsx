import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

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

interface ProductDetailSheetProps {
  product: Product;
  brandName: string;
  whatsappNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SavedAvatar {
  id: string;
  name: string;
  front_view_url: string | null;
  measurements: Json | null;
}

const ProductDetailSheet = ({ 
  product, 
  brandName, 
  whatsappNumber, 
  isOpen, 
  onClose 
}: ProductDetailSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<SavedAvatar | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchUserAvatar();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (userAvatar?.measurements && product.available_sizes.length > 0) {
      // Simple size recommendation based on measurements
      calculateRecommendedSize();
    }
  }, [userAvatar, product]);

  const fetchUserAvatar = async () => {
    const { data, error } = await supabase
      .from('saved_avatars')
      .select('id, name, front_view_url, measurements')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUserAvatar(data);
    }
  };

  const calculateRecommendedSize = () => {
    // Basic size recommendation logic
    const sizes = product.available_sizes;
    if (sizes.length > 0) {
      // For MVP, recommend middle size - can be enhanced with actual measurements
      const middleIndex = Math.floor(sizes.length / 2);
      setRecommendedSize(sizes[middleIndex]);
      setSelectedSize(sizes[middleIndex]);
    }
  };

  const handleTryOn = async () => {
    if (!userAvatar?.front_view_url) {
      toast.error('Create an avatar first to try on clothes');
      navigate('/');
      return;
    }

    setIsTryingOn(true);
    try {
      const { data, error } = await supabase.functions.invoke('try-on-clothing', {
        body: {
          avatarUrl: userAvatar.front_view_url,
          clothingName: product.name,
          clothingType: product.category,
        },
      });

      if (error) throw error;
      
      if (data?.tryOnUrl) {
        setTryOnImage(data.tryOnUrl);
        toast.success('Virtual try-on complete!');
      }
    } catch (error) {
      console.error('Try-on error:', error);
      toast.error('Could not complete virtual try-on');
    } finally {
      setIsTryingOn(false);
    }
  };

  const handleBuyViaWhatsApp = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    const fitId = userAvatar?.id?.slice(0, 8) || 'GUEST';
    const message = encodeURIComponent(
      `Hi ${brandName}! 👋\n\n` +
      `I'd like to purchase:\n` +
      `📦 *${product.name}*\n` +
      `💰 ${formatPrice(product.price, product.currency)}\n` +
      `📏 Size: ${selectedSize}${recommendedSize === selectedSize ? ' (Recommended)' : ''}\n\n` +
      `🆔 My Fit ID: ${fitId}\n\n` +
      `I found this item on MirrorMe by FitVision.`
    );

    // Clean phone number and create WhatsApp link
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="font-display">{product.name}</SheetTitle>
          <p className="text-muted-foreground text-sm">{brandName}</p>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] pb-4">
          {/* Product/Try-on image */}
          <div className="aspect-[3/4] rounded-2xl bg-muted/30 overflow-hidden relative">
            <img 
              src={tryOnImage || product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {isTryingOn && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Fitting on your avatar...</p>
                </div>
              </div>
            )}
            {tryOnImage && (
              <Badge className="absolute top-3 left-3 bg-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Virtual Try-On
              </Badge>
            )}
          </div>

          {/* Price and fit type */}
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-bold text-primary">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.fit_type && (
              <Badge variant="secondary" className="capitalize">
                {product.fit_type} fit
              </Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground text-sm">
              {product.description}
            </p>
          )}

          {/* Size selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Select Size</span>
              {recommendedSize && (
                <span className="text-xs text-primary">
                  Recommended: {recommendedSize}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.available_sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`
                    min-w-[3rem] px-4 py-2 rounded-lg border transition-all font-medium text-sm
                    ${selectedSize === size 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50'
                    }
                    ${recommendedSize === size ? 'ring-2 ring-primary/30' : ''}
                  `}
                >
                  {size}
                  {recommendedSize === size && selectedSize === size && (
                    <Check className="w-3 h-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Try-on button */}
          {user && userAvatar && !tryOnImage && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleTryOn}
              disabled={isTryingOn}
            >
              {isTryingOn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Trying on...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try on My Avatar
                </>
              )}
            </Button>
          )}

          {!user && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Sign in to try on your avatar
            </Button>
          )}
        </div>

        {/* Buy via WhatsApp button - fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button 
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
            size="lg"
            onClick={handleBuyViaWhatsApp}
            disabled={!selectedSize}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Buy via WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetailSheet;
