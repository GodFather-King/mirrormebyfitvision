import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Layers, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LayerItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  brandName?: string;
  productUrl?: string;
}

// Clothing hierarchy for visual ordering
const LAYER_ORDER: Record<string, number> = {
  shoes: 0,
  bottoms: 1,
  tops: 2,
  dresses: 2,
  outerwear: 3,
  accessories: 4,
};

const LAYER_LABELS: Record<string, string> = {
  shoes: '👟 Shoes',
  bottoms: '👖 Bottoms',
  tops: '👕 Top',
  dresses: '👗 Dress',
  outerwear: '🧥 Outerwear',
  accessories: '👜 Accessories',
};

interface OutfitLayerPanelProps {
  items: LayerItem[];
  onRemoveItem: (id: string) => void;
  onTryOnOutfit: () => void;
  isTryingOn: boolean;
  hasAvatar: boolean;
}

const OutfitLayerPanel = ({
  items,
  onRemoveItem,
  onTryOnOutfit,
  isTryingOn,
  hasAvatar,
}: OutfitLayerPanelProps) => {
  // Sort items by layer hierarchy
  const sortedItems = [...items].sort(
    (a, b) => (LAYER_ORDER[a.category] ?? 5) - (LAYER_ORDER[b.category] ?? 5)
  );

  if (items.length === 0) {
    return (
      <div className="glass-card p-3 text-center">
        <Layers className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Tap items below to build your outfit
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">Outfit Layers</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Layer stack */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="relative shrink-0 group"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden ring-1 ring-border bg-muted">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Remove button */}
            <button
              onClick={() => onRemoveItem(item.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-[9px] text-center text-muted-foreground mt-0.5 truncate w-14">
              {LAYER_LABELS[item.category] || item.category}
            </p>
          </div>
        ))}
      </div>

      {/* Try on combined outfit */}
      <Button
        size="sm"
        onClick={onTryOnOutfit}
        disabled={isTryingOn || !hasAvatar || items.length < 2}
        className={cn(
          "w-full text-xs h-8 bg-gradient-to-r from-primary to-secondary",
        )}
      >
        {isTryingOn ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        )}
        Try On Full Outfit ({items.length} items)
      </Button>
    </div>
  );
};

export default OutfitLayerPanel;
