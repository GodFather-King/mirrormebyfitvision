import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Sparkles, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OutfitItem } from './OutfitTryOnDialog';

interface Props {
  items: OutfitItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onTryOn: () => void;
  onReorder: (items: OutfitItem[]) => void;
}

const OutfitBuilderBar = ({ items, onRemove, onClear, onTryOn, onReorder }: Props) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox to start the drag
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onReorder(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // Touch reordering: long-press a thumbnail then tap ◀ / ▶ to nudge
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

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
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                · drag to reorder layers
              </span>
            </div>
            <button
              onClick={onClear}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {items.map((it, index) => (
              <div
                key={it.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative shrink-0 group flex flex-col items-center gap-0.5 transition-all',
                  dragIndex === index && 'opacity-40 scale-95',
                  overIndex === index && dragIndex !== index && 'ring-2 ring-primary rounded-md'
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-md overflow-hidden ring-1 ring-border bg-muted cursor-grab active:cursor-grabbing">
                    <img src={it.image_url} alt={it.name} className="w-full h-full object-cover pointer-events-none" />
                  </div>
                  <GripVertical className="absolute top-0.5 left-0.5 w-3 h-3 text-white/80 drop-shadow pointer-events-none" />
                  <button
                    onClick={() => onRemove(it.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="flex items-center gap-0.5 sm:hidden">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-[10px] leading-none px-1 py-0.5 rounded bg-muted text-muted-foreground disabled:opacity-30"
                    aria-label="Move left"
                  >
                    ◀
                  </button>
                  <span className="text-[9px] text-muted-foreground tabular-nums w-3 text-center">{index + 1}</span>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="text-[10px] leading-none px-1 py-0.5 rounded bg-muted text-muted-foreground disabled:opacity-30"
                    aria-label="Move right"
                  >
                    ▶
                  </button>
                </div>
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
