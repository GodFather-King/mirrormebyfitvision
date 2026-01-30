import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeHeroProps {
  onContinue: () => void;
}

const WelcomeHero = ({ onContinue }: WelcomeHeroProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/60 animate-float-particle" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-secondary/40 animate-float-particle-delayed" />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-primary/40 animate-float-particle-slow" />
        <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 rounded-full bg-secondary/60 animate-float-particle" />
      </div>

      {/* Logo with shimmer */}
      <div className="relative mb-8 animate-scale-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-box">
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </div>
        <div className="absolute inset-0 rounded-3xl holographic-shimmer opacity-50" />
      </div>

      {/* Brand name */}
      <h1 className="font-display text-5xl md:text-6xl font-bold mb-3 animate-text-reveal">
        <span className="gradient-text">MirrorMe</span>
      </h1>

      {/* Tagline */}
      <p className="text-2xl md:text-3xl text-foreground/90 font-light mb-4 animate-text-reveal-delayed">
        Step into the future—now.
      </p>

      {/* Company credit */}
      <p className="text-sm text-muted-foreground mb-12 animate-text-reveal-delayed-2">
        by FitVision (Pty) Ltd, South Africa
      </p>

      {/* CTA Button */}
      <Button
        onClick={onContinue}
        size="lg"
        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground px-8 py-6 text-lg rounded-full glow-box animate-fade-in-delay-3 group"
      >
        Begin Your Journey
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
};

export default WelcomeHero;
