import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Shirt, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface FirstRunWelcomeProps {
  open: boolean;
  displayName?: string | null;
  onStart: () => void;
}

/**
 * Full-screen welcome overlay shown ONCE after signup.
 * Lays out a 3-step roadmap so users always know what to do next.
 */
const FirstRunWelcome = ({ open, displayName, onStart }: FirstRunWelcomeProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(t);
    }
    setMounted(false);
  }, [open]);

  const steps = [
    {
      icon: Camera,
      title: 'Create your avatar',
      desc: 'Upload one full-body photo. Takes 30 seconds.',
      time: '~30s',
    },
    {
      icon: Shirt,
      title: 'Add or scan clothes',
      desc: 'Upload from your closet, or scan in-store.',
      time: '~1 min',
    },
    {
      icon: Sparkles,
      title: 'Try on instantly',
      desc: 'See exactly how outfits look on you.',
      time: 'Instant',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-0 border-0 bg-transparent shadow-none [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="glass-card border border-primary/20 p-6 rounded-2xl bg-background/95 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-3 glow-box">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">
              Welcome{displayName ? `, ${displayName.split(' ')[0]}` : ''}! 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              You're 3 quick steps away from your first try-on
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 transition-all duration-500 ${
                    mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                  }`}
                  style={{ transitionDelay: `${idx * 120}ms` }}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">{step.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-1.5 mb-4 text-[11px] text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span>Your photo stays private. Used only to build your avatar.</span>
          </div>

          {/* CTA */}
          <Button
            onClick={onStart}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground glow-box group"
          >
            Start with Step 1
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            You can revisit this guide anytime from the menu
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FirstRunWelcome;
