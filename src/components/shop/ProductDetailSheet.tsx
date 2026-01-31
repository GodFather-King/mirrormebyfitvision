import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMeasurements } from '@/hooks/useMeasurements';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, MessageCircle, Ruler, ThumbsUp, AlertCircle } from 'lucide-react';
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
  const { measurements, getRecommendedSize, getFitId } = useMeasurements();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<SavedAvatar | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [sizeRecommendation, setSizeRecommendation] = useState<{
    size: string;
    confidence: 'perfect' | 'good' | 'approximate';
  } | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchUserAvatar();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (product.available_sizes.length > 0) {
      const recommendation = getRecommendedSize(
        product.category, 
        product.available_sizes,
        product.fit_type
      );
      setSizeRecommendation(recommendation);
      if (recommendation && !selectedSize) {
        setSelectedSize(recommendation.size);
      }
    }
  }, [measurements, product, isOpen]);

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

    const fitId = getFitId();
    const isRecommended = sizeRecommendation?.size === selectedSize;
    const confidenceText = sizeRecommendation?.confidence === 'perfect' 
      ? '✅ Perfect fit match' 
      : sizeRecommendation?.confidence === 'good'
      ? '👍 Good fit match'
      : '📐 Based on my measurements';

    // Build comprehensive message with measurements
    let message = `Hi ${brandName}! 👋\n\n`;
    message += `I'd like to purchase:\n`;
    message += `📦 *${product.name}*\n`;
    message += `💰 ${formatPrice(product.price, product.currency)}\n`;
    message += `📏 Size: ${selectedSize}`;
    
    if (isRecommended) {
      message += ` (${confidenceText})\n`;
    } else {
      message += `\n`;
    }
    
    message += `\n🆔 *My Fit ID:* ${fitId}\n`;
    
    if (measurements) {
      message += `\n📊 *My Measurements:*\n`;
      message += `• Height: ${measurements.height_cm}cm\n`;
      message += `• Chest: ${measurements.chest_cm}cm\n`;
      message += `• Waist: ${measurements.waist_cm}cm\n`;
      message += `• Hips: ${measurements.hips_cm}cm\n`;
    }
    
    message += `\nI found this item on MirrorMe by FitVision.`;

    const encodedMessage = encodeURIComponent(message);
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getConfidenceColor = (confidence: 'perfect' | 'good' | 'approximate') => {
    switch (confidence) {
      case 'perfect': return 'text-green-500';
      case 'good': return 'text-primary';
      case 'approximate': return 'text-muted-foreground';
    }
  };

  const getConfidenceIcon = (confidence: 'perfect' | 'good' | 'approximate') => {
    switch (confidence) {
      case 'perfect': return <Check className="w-3 h-3" />;
      case 'good': return <ThumbsUp className="w-3 h-3" />;
      case 'approximate': return <AlertCircle className="w-3 h-3" />;
    }
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

          {/* Smart Size Recommendation */}
          {sizeRecommendation && measurements && (
            <div className="bg-primary/5 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Size Recommendation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-sm ${getConfidenceColor(sizeRecommendation.confidence)}`}>
                  {getConfidenceIcon(sizeRecommendation.confidence)}
                  {sizeRecommendation.confidence === 'perfect' && 'Perfect match: '}
                  {sizeRecommendation.confidence === 'good' && 'Good match: '}
                  {sizeRecommendation.confidence === 'approximate' && 'Suggested: '}
                </span>
                <Badge variant="outline" className="text-primary border-primary">
                  Size {sizeRecommendation.size}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on your {measurements.height_cm}cm height, {measurements.chest_cm}cm chest, {measurements.waist_cm}cm waist
              </p>
            </div>
          )}

          {/* Size selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Select Size</span>
              {!measurements && (
                <span className="text-xs text-muted-foreground">
                  Create avatar for size recommendations
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.available_sizes.map((size) => {
                const isRecommended = sizeRecommendation?.size === size;
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`
                      min-w-[3rem] px-4 py-2 rounded-lg border transition-all font-medium text-sm relative
                      ${selectedSize === size 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${isRecommended ? 'ring-2 ring-primary/30' : ''}
                    `}
                  >
                    {size}
                    {isRecommended && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                );
              })}
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
