import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import blazerImg from '@/assets/clothing-blazer.png';
import tshirtImg from '@/assets/clothing-tshirt.png';
import dressImg from '@/assets/clothing-dress.png';

interface ClothingItem {
  id: string;
  name: string;
  brand: string;
  price: string;
  image: string;
  fit: 'Perfect' | 'Good' | 'Adjust';
  type: string;
}

const clothingItems: ClothingItem[] = [
  { id: '1', name: 'Classic Blazer', brand: 'LUXE', price: '$289', image: blazerImg, fit: 'Perfect', type: 'blazer' },
  { id: '2', name: 'Essential Tee', brand: 'BASICS', price: '$49', image: tshirtImg, fit: 'Good', type: 'tshirt' },
  { id: '3', name: 'Midi Dress', brand: 'ELEGANCE', price: '$159', image: dressImg, fit: 'Perfect', type: 'dress' },
];

interface ClothingCarouselProps {
  onSelect: (item: ClothingItem | null) => void;
  selectedId: string | null;
  isApplyingClothing?: boolean;
}

const ClothingCarousel = ({ onSelect, selectedId, isApplyingClothing = false }: ClothingCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % clothingItems.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + clothingItems.length) % clothingItems.length);
  };

  const getFitColor = (fit: string) => {
    switch (fit) {
      case 'Perfect': return 'text-green-400 bg-green-400/10';
      case 'Good': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-orange-400 bg-orange-400/10';
    }
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-secondary" />
          <h3 className="font-display font-semibold text-sm">Virtual Try-On</h3>
        </div>
        <div className="flex items-center gap-2">
          {isApplyingClothing && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Fitting...
            </span>
          )}
          <span className="text-xs text-muted-foreground">{clothingItems.length} items</span>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 overflow-hidden">
          {clothingItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex-shrink-0 w-full transition-all duration-500 ${
                index === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
              }`}
            >
              <div 
                className={`relative glass-card p-3 cursor-pointer transition-all duration-300 ${
                  selectedId === item.id ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
                } ${isApplyingClothing ? 'pointer-events-none opacity-70' : ''}`}
                onClick={() => !isApplyingClothing && onSelect(selectedId === item.id ? null : item)}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted/30 mb-3 relative">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedId === item.id && isApplyingClothing && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                  <p className="font-medium text-sm">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-primary">{item.price}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getFitColor(item.fit)}`}>
                      {item.fit} Fit
                    </span>
                  </div>
                </div>

                {selectedId === item.id && !isApplyingClothing && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <button 
          onClick={prevSlide}
          disabled={isApplyingClothing}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 glass-card rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={nextSlide}
          disabled={isApplyingClothing}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 glass-card rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2">
        {clothingItems.map((_, index) => (
          <button
            key={index}
            onClick={() => !isApplyingClothing && setActiveIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === activeIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Try-on hint */}
      {!selectedId && (
        <p className="text-xs text-center text-muted-foreground">
          Tap an item to try it on your avatar
        </p>
      )}
    </div>
  );
};

export default ClothingCarousel;
