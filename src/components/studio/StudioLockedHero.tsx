import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const PREVIEW_CARDS = [
  { title: 'Braamfontein Streetwear', vibe: 'Urban · Streetwear' },
  { title: 'Township Basketball Court', vibe: 'Kasi · Sneaker Culture' },
  { title: 'Durban Beachfront', vibe: 'Coastal · Lifestyle' },
  { title: 'Sandton Luxury', vibe: 'Premium · Editorial' },
  { title: 'Township Fashion Street', vibe: 'Kasi · High Fashion' },
  { title: 'African Sunset', vibe: 'Nature · Cinematic' },
];

const GRADIENTS = [
  'from-amber-500/40 via-rose-600/30 to-purple-900/60',
  'from-cyan-500/40 via-blue-700/30 to-slate-900/70',
  'from-teal-400/40 via-sky-600/30 to-indigo-900/60',
  'from-fuchsia-500/40 via-purple-700/30 to-slate-900/70',
  'from-orange-500/40 via-pink-600/30 to-slate-900/70',
  'from-yellow-500/40 via-orange-600/40 to-rose-900/70',
];

const StudioLockedHero = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-background p-6 md:p-10">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 0%, hsl(187 100% 42% / 0.25), transparent 50%)' }} />
        <div className="relative space-y-4 max-w-2xl">
          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5">
            <Sparkles className="w-3 h-3" /> Premium Upgrade
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            <span className="gradient-text">MirrorMe AI Fashion Studio</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Create cinematic, South African–inspired fashion campaigns from a single product photo.
            No photographers, no studios, no models. Ready for social, ads and look-books.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Locked — separate from your Digital Store subscription.
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-primary-foreground gap-2"
            onClick={() => navigate('/brand/studio/upgrade')}
          >
            Upgrade to AI Fashion Studio <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Preview · campaign moods you can generate</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PREVIEW_CARDS.map((c, i) => (
            <Card
              key={c.title}
              className="relative aspect-[3/4] overflow-hidden group cursor-pointer border-border/50"
              onClick={() => navigate('/brand/studio/upgrade')}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i]}`} />
              <div className="absolute inset-0 backdrop-blur-[2px] group-hover:backdrop-blur-0 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-white/90" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-[10px] uppercase tracking-wider opacity-80">{c.vibe}</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">{c.title}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudioLockedHero;
