import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrandOwner, OwnedBrand } from '@/hooks/useBrandOwner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import StudioNav from '@/components/studio/StudioNav';
import StudioLockedHero from '@/components/studio/StudioLockedHero';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Images, Sparkles, User, MapPin, Download, Store, CreditCard, ArrowRight } from 'lucide-react';

interface BrandWithStudio extends OwnedBrand {
  ai_studio_enabled?: boolean;
  ai_studio_credits?: number;
}

const TILES = [
  { to: '/brand/studio/create', icon: Plus, label: 'Create Campaign', desc: 'Generate a new AI fashion shoot' },
  { to: '/brand/studio/campaigns', icon: Images, label: 'Previous Campaigns', desc: 'Browse what you have created' },
  { to: '/brand/studio/create', icon: User, label: 'Saved AI Models', desc: 'Curated model presets', soon: true },
  { to: '/brand/studio/create', icon: MapPin, label: 'Saved Environments', desc: 'South African–inspired scenes', soon: true },
  { to: '/brand/studio/campaigns', icon: Download, label: 'Downloads', desc: 'Export-ready assets' },
  { to: '/brand/dashboard', icon: Store, label: 'Brand Assets', desc: 'Logo, cover, store details' },
];

const AIStudioHome = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { brands, loading: ownerLoading, isBrandOwner, isAdmin } = useBrandOwner();
  const [studioBrand, setStudioBrand] = useState<BrandWithStudio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?next=/brand/studio');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!brands.length) { setLoading(false); return; }
      const first = brands[0];
      const { data } = await supabase
        .from('brands')
        .select('ai_studio_enabled, ai_studio_credits')
        .eq('id', first.id)
        .maybeSingle();
      setStudioBrand({ ...first, ...(data as any) });
      setLoading(false);
    };
    if (!ownerLoading) load();
  }, [brands, ownerLoading]);

  if (authLoading || ownerLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isBrandOwner) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-10">
          <Card className="p-8 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold">AI Fashion Studio is for brand owners</h1>
            <p className="text-sm text-muted-foreground">You need an approved brand on MirrorMe to access this premium tool.</p>
            <Button variant="outline" onClick={() => navigate('/local-brands')}>Browse brands</Button>
          </Card>
        </div>
      </div>
    );
  }

  const enabled = !!studioBrand?.ai_studio_enabled || isAdmin;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <StudioNav />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {!enabled ? (
          <StudioLockedHero />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3" /> Premium Active · Beta
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                  {studioBrand?.name} Fashion Studio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate cinematic, South African–inspired campaigns in minutes.
                </p>
              </div>
              <Button
                onClick={() => navigate('/brand/studio/create')}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground gap-1.5 hidden md:inline-flex"
              >
                <Plus className="w-4 h-4" /> New campaign
              </Button>
            </div>

            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Generation Credits</p>
                <p className="text-xs text-muted-foreground">Beta access — unlimited campaigns during launch.</p>
              </div>
              <Badge variant="secondary">Beta · Unlimited</Badge>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TILES.map((t) => {
                const Icon = t.icon;
                return (
                  <Card
                    key={t.label}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => navigate(t.to)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/15">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{t.label}</p>
                      {t.soon && <Badge variant="outline" className="text-[9px]">Soon</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </Card>
                );
              })}
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/brand/studio/create')}
              className="w-full md:hidden bg-gradient-to-r from-primary to-secondary text-primary-foreground gap-2"
            >
              Create your first campaign <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIStudioHome;
