import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import StudioNav from '@/components/studio/StudioNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Camera, Users, Globe, Download, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BENEFITS = [
  { icon: Camera, title: 'No photographers needed', desc: 'Skip studio bookings and shoot fees.' },
  { icon: Users, title: 'No expensive models', desc: 'AI models in every body type and skin tone.' },
  { icon: Globe, title: 'South African–inspired scenes', desc: 'Braamfontein, Kasi, Durban beachfront, Sandton.' },
  { icon: Zap, title: 'Generate in minutes', desc: 'Social-ready visuals on demand.' },
  { icon: Download, title: 'Download & share instantly', desc: 'Export for Instagram, WhatsApp, ads.' },
  { icon: Sparkles, title: 'Magazine-quality output', desc: 'Editorial lighting and cinematic composition.' },
];

const AIStudioUpgrade = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { brands, loading: ownerLoading } = useBrandOwner();
  const [activating, setActivating] = useState(false);
  const [alreadyActive, setAlreadyActive] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?next=/brand/studio/upgrade');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const check = async () => {
      if (!brands.length) return;
      const { data } = await supabase.from('brands').select('ai_studio_enabled').eq('id', brands[0].id).maybeSingle();
      if ((data as any)?.ai_studio_enabled) setAlreadyActive(true);
    };
    check();
  }, [brands]);

  const activate = async () => {
    if (!brands.length) {
      toast.error('You need an approved brand to activate the Studio.');
      return;
    }
    setActivating(true);
    const { error } = await (supabase.from('brands') as any)
      .update({ ai_studio_enabled: true })
      .eq('id', brands[0].id);
    setActivating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('AI Fashion Studio activated for ' + brands[0].name);
    navigate('/brand/studio');
  };

  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <StudioNav />
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5">
            <Sparkles className="w-3 h-3" /> Premium Upgrade
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            <span className="gradient-text">Create professional AI fashion campaigns instantly.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The MirrorMe AI Fashion Studio is a premium upgrade on top of your Digital Store subscription.
            Turn one product photo into a full cinematic campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <Card key={b.title} className="p-4 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-primary" /> {b.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 md:p-8 border-primary/40 bg-gradient-to-br from-card to-primary/5">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <Badge variant="secondary" className="mb-2">Founders Launch · Beta</Badge>
              <h2 className="text-xl font-bold">Activate AI Fashion Studio</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Free for approved brands during the launch beta. Pricing tiers launching soon —
                you keep access at the founders rate.
              </p>
            </div>
            <Button
              size="lg"
              disabled={activating || alreadyActive}
              onClick={activate}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground gap-2"
            >
              {activating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : alreadyActive ? (
                <>Already active</>
              ) : (
                <>Activate (Beta) <Sparkles className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          This is separate from your Digital Store subscription and can be cancelled at any time.
        </p>
      </div>
    </div>
  );
};

export default AIStudioUpgrade;
