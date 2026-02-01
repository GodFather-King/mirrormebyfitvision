import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TryOnItemCardProps {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  currency?: string;
  brandName?: string;
  isFavorite?: boolean;
  isSelected?: boolean;
  isTryingOn?: boolean;
  onTryOn: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

const categoryEmojis: Record<string, string> = {
  tops: '👕',
  bottoms: '👖',
  dresses: '👗',
  outerwear: '🧥',
  shoes: '👟',
  accessories: '👜',
};

const TryOnItemCard = ({
  id,
  name,
  category,
  imageUrl,
  price,
  currency,
  brandName,
  isFavorite = false,
  isSelected = false,
  isTryingOn = false,
  onTryOn,
  onToggleFavorite,
}: TryOnItemCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <Card 
      className={cn(
        "glass-card border-0 overflow-hidden cursor-pointer transition-all duration-200 group",
        isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20",
        isTryingOn && "opacity-70 pointer-events-none"
      )}
      onClick={() => !isTryingOn && onTryOn(id)}
    >
      <CardContent className="p-0 relative">
        {/* Try-on indicator */}
        <div className="absolute top-2 left-2 z-10">
          {isTryingOn ? (
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Selected indicator */}
        {isSelected && !isTryingOn && (
          <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        )}

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(id);
            }}
            className={cn(
              "absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              isFavorite ? "bg-destructive text-destructive-foreground" : "bg-background/50 text-foreground hover:bg-background/70"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        )}

        {/* Image */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-muted-foreground/20 animate-pulse" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={name}
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              imageLoaded ? "opacity-100" : "opacity-0",
              "group-hover:scale-105"
            )}
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {!isTryingOn && (
              <span className="text-xs font-medium text-primary bg-background/90 px-3 py-1.5 rounded-full">
                Tap to try on
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          {brandName && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
              {brandName}
            </p>
          )}
          <h3 className="font-medium text-xs truncate">{name}</h3>
          <div className="flex items-center justify-between gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {categoryEmojis[category] || '👕'} {category}
            </Badge>
            {price && currency && (
              <span className="text-xs font-semibold text-primary">
                {formatPrice(price, currency)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TryOnItemCard;
