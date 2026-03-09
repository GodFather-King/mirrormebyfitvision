import { useNavigate } from 'react-router-dom';
import { Camera, Scan, Shirt, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: Camera,
    title: 'Upload Your Photo',
    description: 'Take or upload a full-body photo. MirrorMe uses it to build your personalized digital avatar.',
  },
  {
    icon: Scan,
    title: 'Get Your Avatar',
    description: 'Our AI creates a realistic avatar that matches your body shape, proportions, and measurements.',
  },
  {
    icon: Shirt,
    title: 'Try On Clothes',
    description: 'Browse items from our partner brands or your own wardrobe—and see how they look on your avatar instantly.',
  },
  {
    icon: ShoppingBag,
    title: 'Shop With Confidence',
    description: 'Know your fit before you buy. Fewer returns, smarter purchases, and a wardrobe you actually love.',
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-radial)' }} />
        <div className="relative max-w-lg mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Your Virtual Fitting Room
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
            How <span className="gradient-text">MirrorMe</span> Works
          </h1>
          <p className="text-muted-foreground text-base max-w-sm mx-auto">
            Try clothes on your digital twin before you buy. Four simple steps to a smarter wardrobe.
          </p>
        </div>
      </section>

      {/* Demo Video */}
      <section className="px-4 pb-8 max-w-lg mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <video
            src="/videos/how-it-works-demo.mp4"
            controls
            playsInline
            preload="metadata"
            poster=""
            className="w-full aspect-video object-cover"
          />
          <div className="px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground">See MirrorMe in action</p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 pb-12 max-w-lg mx-auto space-y-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="glass-card p-5 flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step {i + 1}</p>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 max-w-lg mx-auto text-center space-y-4">
        <h2 className="font-display text-xl font-bold">Ready to See Yourself?</h2>
        <p className="text-sm text-muted-foreground">Create your free avatar and start trying on clothes today.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="glow" size="lg" onClick={() => navigate('/')}>
            Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/pricing')}>
            View Plans
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
