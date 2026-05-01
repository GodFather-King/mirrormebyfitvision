import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Sparkles, X } from 'lucide-react';
import type { OutfitItem } from './OutfitTryOnDialog';

const LAYER_ORDER: Record<string, number> = {
  shoes: 0, bottoms: 1, tops: 2, dresses: 2, outerwear: 3, accessories: 4,
};

interface Props {
  items: OutfitItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onTryOn: () => void;
}

const OutfitBuilderBar = ({ items, onRemove, onClear, onTryOn }: Props) => {
  if (items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => (LAYER_ORDER[a.category] ?? 5) - (LAYER_ORDER[b.category] ?? 5)
  );

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-3 pointer-events-none md:bottom-4">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <div className="glass-card border border-primary/30 p-2.5 shadow-lg shadow-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Outfit Builder</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {items.length}
              </Badge>
            </div>
            <button
              onClick={onClear}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {sorted.map((it) => (
              <div key={it.id} className="relative shrink-0 group">
                <div className="w-12 h-12 rounded-md overflow-hidden ring-1 ring-border bg-muted">
                  <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => onRemove(it.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            disabled={items.length < 2}
            onClick={onTryOn}
            className="w-full text-xs h-8 bg-gradient-to-r from-primary to-secondary"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {items.length < 2 ? 'Add 1 more item to try outfit' : `Try Full Outfit (${items.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OutfitBuilderBar;
