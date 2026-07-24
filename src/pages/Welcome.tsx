import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, ArrowRight, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import { useWorkspace, type Workspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';

type WorkspaceCard = {
  id: Workspace;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  accent: string;
  resolve: () => { cta: string; path: string };
};

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isBrandOwner, isAdmin } = useBrandOwner();
  const { setWorkspace } = useWorkspace();
  const [remember, setRemember] = useState(true);

  const cards = useMemo<WorkspaceCard[]>(() => [
    {
      id: 'consumer',
      title: 'Virtual Try-On',
      description:
        'Try on clothing from local brands, online stores, or even your own wardrobe using your personalized AI avatar.',
      icon: Sparkles,
      features: ['AI Avatar', 'Local Brands', 'Online Fashion', 'Wardrobe', 'Saved Outfits', 'Share to WhatsApp'],
      accent: 'from-primary/80 to-secondary/60',
      resolve: () => ({ cta: 'Start Trying On', path: '/' }),
    },
    {
      id: 'brand',
      title: 'Brand Studio',
      description:
        'Manage your digital clothing store, receive customer orders, create AI fashion campaigns, and grow your brand.',
      icon: ShoppingBag,
      features: ['Dashboard', 'Orders', 'AI Fashion Studio', 'Campaigns', 'Analytics'],
      accent: 'from-amber-400/70 to-primary/60',
      resolve: () =>
        isBrandOwner || isAdmin
          ? { cta: 'Open Brand Dashboard', path: '/brand/dashboard' }
          : { cta: 'Become a Brand Partner', path: '/brand/apply' },
    },
  ], [isBrandOwner, isAdmin]);

  const handleChoose = (card: WorkspaceCard) => {
    const { path } = card.resolve();
    setWorkspace(card.id, { remember });
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-10 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-lg gradient-text">MIRROR</span>
            <span className="font-display font-bold text-lg text-foreground">ME</span>
          </div>
          {user && (
            <button
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          )}
        </div>

        <div className="text-center mb-10 md:mb-14 animate-fade-in">
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
            Welcome to <span className="gradient-text">MirrorMe</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            What would you like to do today?
          </p>
        </div>

        <div
          className={cn(
            'grid gap-5 md:gap-6',
            cards.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            const { cta } = card.resolve();
            return (
              <button
                key={card.id}
                onClick={() => handleChoose(card)}
                className="group relative text-left glass-card rounded-3xl p-6 md:p-8 border border-border/60 hover:border-primary/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)] overflow-hidden"
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70', card.accent)} />
                <div className={cn('w-14 h-14 rounded-2xl mb-5 flex items-center justify-center bg-gradient-to-br', card.accent)}>
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-2 text-foreground">{card.title}</h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{card.description}</p>

                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-6">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-foreground/80">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{cta}</span>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              className="border-border/70"
            />
            <span className="text-sm text-foreground/90">Remember my preferred workspace</span>
          </label>
          <p className="text-xs text-muted-foreground">
            You can change this anytime from the sidebar → Switch Workspace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
