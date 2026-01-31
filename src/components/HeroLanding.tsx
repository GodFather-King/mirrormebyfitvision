import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeroLandingProps {
  onGetStarted: () => void;
}

const HeroLanding = ({ onGetStarted }: HeroLandingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleGetStarted = () => {
    onGetStarted();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Abstract Mirror Background - Phase 1 */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${revealed ? 'opacity-30' : 'opacity-100'}`}>
        {/* Central mirror light source */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          {/* Soft radial glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-foreground/5 to-secondary/20 blur-[120px] animate-pulse-slow" />
          
          {/* Mirror reflection rings */}
          <div className="absolute inset-[10%] rounded-full border border-foreground/5" />
          <div className="absolute inset-[20%] rounded-full border border-foreground/[0.03]" />
          <div className="absolute inset-[30%] rounded-full border border-primary/10" />
          <div className="absolute inset-[40%] rounded-full border border-foreground/[0.02]" />
          
          {/* Light beam from center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-[400px] bg-gradient-to-t from-transparent via-foreground/5 to-transparent rotate-12 blur-sm" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-[350px] bg-gradient-to-t from-transparent via-primary/10 to-transparent -rotate-12 blur-sm" />
        </div>

        {/* Ambient floating light particles */}
        <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-foreground/10 animate-float-gentle" />
        <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-primary/20 animate-float-gentle-delayed" />
        <div className="absolute bottom-[30%] left-[25%] w-1 h-1 rounded-full bg-foreground/10 animate-float-gentle-slow" />
        <div className="absolute top-[35%] right-[30%] w-2 h-2 rounded-full bg-secondary/10 animate-float-gentle" />
        
        {/* Soft edge vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
      </div>

      {/* Avatar Reveal - Phase 2 */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 pointer-events-none ${
          revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ top: '-10%' }}
      >
        <div className="relative w-[300px] h-[420px] md:w-[340px] md:h-[480px]">
          {/* Soft glow behind avatar */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent blur-3xl scale-110" />
          
          {/* Avatar silhouette - neutral, inclusive */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/lovable-uploads/3d-avatar-hero.png"
              alt="Your digital reflection"
              className="w-full h-full object-contain opacity-90"
              style={{ 
                filter: 'drop-shadow(0 20px 40px hsl(var(--primary) / 0.2))'
              }}
            />
          </div>
          
          {/* Subtle scan line */}
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent scan-line-slow" />
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Minimal Header */}
        <header className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-display font-semibold text-lg tracking-tight text-foreground/90">MIRROR</span>
            <span className="font-display font-semibold text-lg tracking-tight text-primary">ME</span>
          </div>
          
          {!user && (
            <Button
              onClick={() => navigate('/auth')}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Sign In
            </Button>
          )}
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
          {/* Phase 1: Initial Message */}
          <div className={`transition-all duration-700 ${revealed ? 'opacity-0 -translate-y-8 absolute' : 'opacity-100 translate-y-0'}`}>
            <div className="text-center space-y-6">
              <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.1] tracking-tight animate-text-reveal">
                <span className="text-foreground">See yourself.</span>
                <br />
                <span className="text-muted-foreground">Clearly.</span>
              </h1>
              
              <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto animate-text-reveal-delayed">
                Your reflection, reimagined. A digital mirror that knows your shape, your style, your story.
              </p>

              <div className="pt-4 animate-text-reveal-delayed-2">
                <Button
                  onClick={handleReveal}
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/90 px-8 py-6 text-base rounded-full group"
                >
                  Begin
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Scroll indicator */}
              <div 
                className="pt-12 flex flex-col items-center gap-2 cursor-pointer animate-bounce-subtle"
                onClick={handleReveal}
              >
                <span className="text-xs text-muted-foreground/60 uppercase tracking-widest">Scroll</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Phase 2: Revealed Content */}
          <div className={`transition-all duration-700 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
            <div className="text-center space-y-6 mt-[45vh]">
              <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-medium">
                Your Digital Self
              </p>
              
              <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                <span className="text-foreground">Created from your phone.</span>
                <br />
                <span className="text-muted-foreground">Worn by you.</span>
              </h2>

              {/* Subtle feature hints */}
              <div className="flex justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 border border-border/50">
                    <span className="text-lg">📱</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Scan</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 border border-border/50">
                    <span className="text-lg">👔</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Try On</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 border border-border/50">
                    <span className="text-lg">💬</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Share</span>
                </div>
              </div>

              <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
                Build your wardrobe. Try before you buy. Shop with clarity.
              </p>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="w-full max-w-xs bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base rounded-full"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                {!user && (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button 
                      onClick={() => navigate('/auth')} 
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground/50">
            by FitVision (Pty) Ltd · South Africa
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HeroLanding;
