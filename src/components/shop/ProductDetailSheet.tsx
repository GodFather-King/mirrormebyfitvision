import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { useMeasurements } from '@/hooks/useMeasurements';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, MessageCircle, Ruler, ThumbsUp, AlertCircle, X, User, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface ProductDetailSheetProps {
  product: Product;
  brandName: string;
  whatsappNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

// Get product images from database - main image plus additional images
const getProductImages = (mainImage: string, additionalImages?: string[] | null) => {
  const images = [mainImage];
  if (additionalImages && additionalImages.length > 0) {
    images.push(...additionalImages);
  }
  return images;
};

// Available colors - in production these would come from the product data
const AVAILABLE_COLORS = [
  { name: 'Black', value: 'black', hex: '#1a1a1a' },
  { name: 'White', value: 'white', hex: '#ffffff' },
  { name: 'Navy', value: 'navy', hex: '#1e3a5f' },
  { name: 'Olive', value: 'olive', hex: '#556b2f' },
];

const ProductDetailSheet = ({ 
  product, 
  brandName, 
  whatsappNumber, 
  isOpen, 
  onClose 
}: ProductDetailSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { avatarUrl, hasAvatar, isLoading: avatarLoading } = useAvatar();
  const { measurements, getRecommendedSize, getFitId } = useMeasurements();
  
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(AVAILABLE_COLORS[0].value);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [viewMode, setViewMode] = useState<'product' | 'tryon'>('product');
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [sizeRecommendation, setSizeRecommendation] = useState<{
    size: string;
    confidence: 'perfect' | 'good' | 'approximate';
  } | null>(null);

  const productImages = getProductImages(product.image_url, product.additional_images);

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

  // Reset states when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setTryOnImage(null);
      setSelectedImageIndex(0);
      setViewMode('product');
      setHasAutoTriggered(false);
    }
  }, [isOpen]);

  // Auto-trigger try-on when user has avatar and sheet opens
  useEffect(() => {
    if (isOpen && hasAvatar && avatarUrl && !hasAutoTriggered && !avatarLoading) {
      setHasAutoTriggered(true);
      // Small delay to let sheet animation complete
      const timer = setTimeout(() => {
        handleTryOn();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasAvatar, avatarUrl, hasAutoTriggered, avatarLoading]);

  const handleTryOn = async () => {
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first to try on clothes');
      onClose();
      navigate('/');
      return;
    }

    setViewMode('tryon');
    setIsTryingOn(true);
    
    try {
      // Convert relative image URL to absolute for AI gateway
      const absoluteImageUrl = product.image_url ? 
        (product.image_url.startsWith('http') ? product.image_url : `${window.location.origin}${product.image_url.startsWith('/') ? '' : '/'}${product.image_url}`) 
        : undefined;

      const { data, error } = await supabase.functions.invoke('try-on-clothing', {
        body: {
          avatarUrl: avatarUrl,
          clothingName: product.name,
          clothingType: product.category,
          clothingImageUrl: absoluteImageUrl,
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
      // Revert to product view on error
      setViewMode('product');
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

    const selectedColorName = AVAILABLE_COLORS.find(c => c.value === selectedColor)?.name || selectedColor;

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

    message += `🎨 Color: ${selectedColorName}\n`;
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
    return new Intl.NumberFormat('en-ZA', {
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

  // Determine display image based on view mode
  const displayImage = viewMode === 'tryon' 
    ? (tryOnImage || avatarUrl)
    : productImages[selectedImageIndex];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0 overflow-hidden">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/50 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="h-full overflow-y-auto pb-28">
          {/* Image Gallery Section */}
          <div className="relative bg-muted/20">
            {/* View Mode Toggle - for users with avatar */}
            {hasAvatar && (
              <div className="absolute top-4 left-4 z-30 flex rounded-full bg-background/80 backdrop-blur-sm border border-border/50 p-1">
                <button
                  onClick={() => setViewMode('product')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    viewMode === 'product'
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Product
                </button>
                <button
                  onClick={() => {
                    setViewMode('tryon');
                    if (!tryOnImage && !isTryingOn) {
                      handleTryOn();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    viewMode === 'tryon'
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="w-3 h-3" />
                  Try On
                </button>
              </div>
            )}

            {/* Main Image */}
            <div className="aspect-[3/4] relative overflow-hidden">
              {viewMode === 'tryon' ? (
                <>
                  {/* Avatar/Try-on view */}
                  <div className="w-full h-full bg-gradient-to-b from-primary/10 via-transparent to-secondary/10 flex items-center justify-center">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={tryOnImage ? `You in ${product.name}` : "Your avatar"}
                        className={cn(
                          "max-h-full max-w-full object-contain transition-all duration-300",
                          isTryingOn && "opacity-50 scale-95"
                        )}
                      />
                    ) : (
                      <div className="text-center p-6">
                        <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading avatar...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Loading overlay */}
                  {isTryingOn && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative mb-4">
                          <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping absolute inset-0" />
                          <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center relative">
                            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Fitting on your avatar...</p>
                        <p className="text-xs text-muted-foreground mt-1">{product.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Try-on success badge */}
                  {tryOnImage && !isTryingOn && (
                    <Badge className="absolute top-14 right-4 bg-primary/90 backdrop-blur-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Virtual Try-On
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  {/* Product view */}
                  <img 
                    src={productImages[selectedImageIndex]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-0 right-0 px-4">
              <div className="flex justify-center gap-2">
                {viewMode === 'product' ? (
                  <>
                    {productImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={cn(
                          "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                          selectedImageIndex === index
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-background/50 opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {/* In try-on mode, show avatar thumbnail and try-on result */}
                    {avatarUrl && (
                      <button
                        onClick={() => setTryOnImage(null)}
                        className={cn(
                          "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                          !tryOnImage
                            ? "border-secondary ring-2 ring-secondary/30"
                            : "border-background/50 opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover" />
                      </button>
                    )}
                    {tryOnImage && (
                      <button
                        onClick={() => {}}
                        className="w-14 h-14 rounded-lg overflow-hidden border-2 border-primary ring-2 ring-primary/30"
                      >
                        <img src={tryOnImage} alt="Try-on result" className="w-full h-full object-cover" />
                      </button>
                    )}
                    {/* Show product thumbnail in try-on mode */}
                    <button
                      onClick={() => setViewMode('product')}
                      className="w-14 h-14 rounded-lg overflow-hidden border-2 border-border/50 opacity-70 hover:opacity-100 transition-all"
                    >
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="px-5 py-6 space-y-6">
            {/* Brand & Name */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                {brandName}
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-bold text-primary">
                {formatPrice(product.price, product.currency)}
              </span>
              {product.fit_type && (
                <Badge variant="secondary" className="capitalize text-xs">
                  {product.fit_type} fit
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Color Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Color</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {AVAILABLE_COLORS.find(c => c.value === selectedColor)?.name}
                </span>
              </div>
              <div className="flex gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all relative",
                      selectedColor === color.value
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:scale-105"
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {selectedColor === color.value && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className={cn(
                          "w-4 h-4",
                          color.value === 'white' ? "text-foreground" : "text-white"
                        )} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Size Recommendation */}
            {sizeRecommendation && measurements && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
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
                  <Badge variant="outline" className="text-primary border-primary font-semibold">
                    Size {sizeRecommendation.size}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your {measurements.height_cm}cm height, {measurements.chest_cm}cm chest
                </p>
              </div>
            )}

            {/* Size Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Size</span>
                {!measurements && (
                  <span className="text-xs text-muted-foreground">
                    Create avatar for size tips
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.available_sizes.map((size) => {
                  const isRecommended = sizeRecommendation?.size === size;
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[3.5rem] h-12 px-5 rounded-full border-2 transition-all font-semibold text-sm relative",
                        isSelected 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : "border-border bg-background hover:border-primary/50",
                        isRecommended && !isSelected && "ring-2 ring-primary/20"
                      )}
                    >
                      {size}
                      {isRecommended && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Try-On Status - for users with avatar */}
            {user && hasAvatar && (
              <div className="space-y-3">
                {tryOnImage ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Virtual try-on ready!</p>
                        <p className="text-xs text-muted-foreground">Tap "Try On" above to see the result</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewMode('tryon');
                      }}
                    >
                      View
                    </Button>
                  </div>
                ) : viewMode === 'product' && !isTryingOn ? (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-full border-2"
                    onClick={() => {
                      setViewMode('tryon');
                      handleTryOn();
                    }}
                    disabled={isTryingOn || avatarLoading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Try on My Avatar
                  </Button>
                ) : isTryingOn ? (
                  <div className="bg-muted/30 rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Generating virtual try-on...</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* No avatar prompt */}
            {user && !hasAvatar && !avatarLoading && (
              <div className="bg-muted/30 rounded-2xl p-5 text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Create your avatar to try on clothes virtually
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                >
                  Create Avatar
                </Button>
              </div>
            )}

            {/* Not signed in */}
            {!user && (
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-full"
                onClick={() => {
                  onClose();
                  navigate('/auth');
                }}
              >
                Sign in to try on clothes
              </Button>
            )}
          </div>
        </div>

        {/* Fixed Bottom Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
          <Button 
            className="w-full h-14 rounded-full text-base font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-[#25D366]/30"
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
