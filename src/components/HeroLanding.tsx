import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Camera, Shirt, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeroLandingProps {
  onGetStarted: () => void;
}

const HeroLanding = ({ onGetStarted }: HeroLandingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[80px]" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[60px]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/60 animate-float-particle" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-secondary/40 animate-float-particle-delayed" />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-primary/40 animate-float-particle-slow" />
        <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 rounded-full bg-secondary/60 animate-float-particle" />
        <div className="absolute top-1/2 left-1/6 w-2.5 h-2.5 rounded-full bg-primary/30 animate-float-particle-delayed" />
      </div>

      {/* 3D Avatar Background - Centered with glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-5%' }}>
        <div className="relative w-[320px] h-[450px] md:w-[380px] md:h-[520px]">
          {/* Glow behind avatar */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-secondary/15 to-transparent blur-3xl scale-125" />
          
          {/* Avatar image with holographic effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/lovable-uploads/3d-avatar-hero.png"
              alt="3D Avatar"
              className="w-full h-full object-contain drop-shadow-2xl animate-scale-in"
              style={{ 
                filter: 'drop-shadow(0 20px 40px hsl(var(--primary) / 0.3))'
              }}
            />
            {/* Holographic shimmer overlay */}
            <div className="absolute inset-0 holographic-shimmer opacity-20 rounded-3xl" />
          </div>
          
          {/* Scan line effect */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent scan-line" />
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar with logo only */}
        <header className="px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-xl gradient-text">MIRROR</span>
            <span className="font-display font-bold text-xl text-foreground">ME</span>
          </div>
        </header>

        {/* Main content - pushed to bottom */}
        <div className="flex-1 flex flex-col justify-end px-6 pb-12 max-w-md mx-auto w-full">
          {/* Hero text */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="gradient-text">Your Future Self</span>
              <br />
              <span className="text-foreground">Awaits</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Create your digital twin. Try on outfits before you buy. 
              Shop smarter, with confidence.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="flex justify-center gap-8 mb-8 animate-fade-in-delay-1">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Scan</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Shirt className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-xs text-muted-foreground">Try On</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Share</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 animate-fade-in-delay-2">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground py-6 text-lg rounded-2xl glow-box group"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {!user && (
              <Button
                onClick={() => navigate('/auth')}
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground hover:text-foreground py-6 text-base"
              >
                Already have an account? <span className="text-primary ml-1">Sign In</span>
              </Button>
            )}
          </div>

          {/* Company credit */}
          <p className="text-center text-xs text-muted-foreground/60 mt-8 animate-fade-in-delay-3">
            by FitVision (Pty) Ltd, South Africa
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroLanding;
