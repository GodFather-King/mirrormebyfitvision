import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Smartphone, ShoppingBag, Users } from 'lucide-react';

interface ValueCarouselProps {
  onContinue: () => void;
  onBack: () => void;
}

const slides = [
  {
    icon: Smartphone,
    title: "Your Digital Self",
    description: "Picture this: a digital version of yourself, created with just your phone. Your proportions. Your shape. Your unique silhouette."
  },
  {
    icon: ShoppingBag,
    title: "Try Before You Buy",
    description: "Try on outfits before you buy. See exactly how they'll look on your body. Build a personal wardrobe of pieces you own—and pieces you love."
  },
  {
    icon: Users,
    title: "Connect & Share",
    description: "Share your avatar looks with friends. Get real opinions, in real time. Connect with people who get your style."
  }
];

const ValueCarousel = ({ onContinue, onBack }: ValueCarouselProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onContinue();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
      {/* Progress dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'w-8 bg-primary' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div 
        key={currentSlide}
        className="max-w-md mx-auto animate-slide-fade-in"
      >
        {/* Icon */}
        <div className="relative mb-8 mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
          <div className="relative w-full h-full rounded-2xl glass-card flex items-center justify-center">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 gradient-text">
          {slide.title}
        </h2>

        {/* Description */}
        <p className="text-lg text-foreground/80 leading-relaxed mb-12">
          {slide.description}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handlePrev}
          variant="ghost"
          size="lg"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          size="lg"
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground px-8 rounded-full glow-box group"
        >
          {currentSlide < slides.length - 1 ? 'Continue' : 'Almost there'}
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export default ValueCarousel;
