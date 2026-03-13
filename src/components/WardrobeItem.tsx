import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Trash2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WardrobeItemProps {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  color?: string | null;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const categoryEmojis: Record<string, string> = {
  tops: '👕',
  bottoms: '👖',
  dresses: '👗',
  outerwear: '🧥',
  shoes: '👟',
  accessories: '👜',
};

const WardrobeItem = ({
  id,
  name,
  category,
  imageUrl,
  color,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
  isDeleting = false,
}: WardrobeItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card 
      className={cn(
        "glass-card border-0 overflow-hidden cursor-pointer transition-all duration-200",
        isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20"
      )}
      onClick={() => onSelect(id)}
    >
      <CardContent className="p-0 relative">
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id);
          }}
          className={cn(
            "absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            isFavorite ? "bg-red-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>

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
            loading="lazy"
            decoding="async"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate flex-1">{name}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {categoryEmojis[category]} {category}
            </Badge>
            {color && (
              <span className="text-xs text-muted-foreground truncate">{color}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WardrobeItem;
