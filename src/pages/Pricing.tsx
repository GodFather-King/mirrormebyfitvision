import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Crown, Star, ArrowRight, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  planKey: string;
  price: string;
  amount: number;
  priceNote?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  description: string;
  icon: React.ElementType;
  features: PlanFeature[];
  cta: string;
  ctaVariant: 'default' | 'glow' | 'gradient' | 'outline';
  highlight?: boolean;
  notes?: string[];
}

const plans: Plan[] = [
  {
    name: 'Free',
    planKey: 'free',
    price: '$0',
    amount: 0,
    description: 'For new users getting started.',
    icon: Star,
    features: [
      { text: '1 avatar', included: true },
      { text: '2 try-ons per day', included: true },
      { text: 'Chat with peers', included: true },
      { text: 'AI style suggestions', included: true },
      { text: 'Unlimited try-ons', included: false },
      { text: 'Full wardrobe access', included: false },
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline',
    notes: ['Daily try-on limit applies', 'Only one avatar allowed'],
  },
  {
    name: '5-Day Full Access',
    planKey: 'trial',
    price: 'R20',
    amount: 20,
    priceNote: 'one-time',
    badge: 'Best Value',
    badgeVariant: 'default',
    description: 'Unlock everything for 5 days.',
    icon: Zap,
    features: [
      { text: 'Everything unlocked', included: true },
      { text: 'Unlimited try-ons', included: true },
      { text: '2 avatars total', included: true },
      { text: 'Full wardrobe access', included: true },
      { text: 'AI style suggestions', included: true },
      { text: 'Chat with peers', included: true },
    ],
    cta: 'Start Trial — R20',
    ctaVariant: 'glow',
    highlight: true,
    notes: ['Trial lasts 5 days', 'Automatically expires', 'No auto-renewal'],
  },
  {
    name: 'Premium',
    planKey: 'premium',
    price: 'R180',
    amount: 180,
    priceNote: '/month',
    description: 'For power users who want it all.',
    icon: Crown,
    features: [
      { text: '2 avatars', included: true },
      { text: 'Unlimited try-ons', included: true },
      { text: 'Full wardrobe access', included: true },
      { text: 'Priority new features', included: true },
      { text: 'AI style suggestions', included: true },
      { text: 'Chat with peers', included: true },
    ],
    cta: 'Upgrade to Premium',
    ctaVariant: 'gradient',
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('pricing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [showPaymentChoice, setShowPaymentChoice] = useState<Plan | null>(null);
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  // Check for payment result in URL
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success') {
      toast.success('Payment successful! Your plan has been upgraded.');
    } else if (paymentResult === 'cancelled') {
      toast.error('Payment was cancelled.');
    } else if (paymentResult === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, [searchParams]);

  // Fetch current subscription
  useEffect(() => {
    if (!user) return;
    const fetchSub = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.status === 'active') {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setCurrentPlan('free');
        } else {
          setCurrentPlan(data.plan);
        }
      }
    };
    fetchSub();
  }, [user]);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.planKey === 'free') return;
    if (!user) {
      toast.error('Please sign in to upgrade your plan.');
      navigate('/auth');
      return;
    }
    setShowPaymentChoice(plan);
  };

  const handlePayFast = async (plan: Plan) => {
    setShowPaymentChoice(null);
    setLoadingPlan(plan.planKey);
    try {
      const response = await supabase.functions.invoke('payfast-payment', {
        body: {
          plan: plan.planKey,
          amount: plan.amount.toString(),
          itemName: `MirrorMe ${plan.name}`,
        },
      });
      if (response.error) throw new Error(response.error.message);
      const { paymentData, paymentUrl } = response.data;
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentUrl;
      for (const [key, value] of Object.entries(paymentData)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleYoco = async (plan: Plan) => {
    setShowPaymentChoice(null);
    setLoadingPlan(plan.planKey);
    try {
      const response = await supabase.functions.invoke('yoco-checkout', {
        body: {
          plan: plan.planKey,
          amount: plan.amount.toString(),
          itemName: `MirrorMe ${plan.name}`,
        },
      });
      if (response.error) throw new Error(response.error.message);
      const { redirectUrl } = response.data;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No redirect URL returned');
      }
    } catch (error: any) {
      console.error('Yoco payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header />

      <div className="pt-20 px-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Start free. Upgrade only when you want more. No hidden fees, no surprises.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-5">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.planKey;
            const isLoading = loadingPlan === plan.planKey;

            return (
              <div
                key={plan.name}
                className={`glass-card p-5 space-y-4 transition-all ${
                  plan.highlight
                    ? 'ring-2 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.15)]'
                    : ''
                }`}
              >
                {/* Plan header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  {plan.badge && (
                    <Badge variant={plan.badgeVariant} className="text-[10px] uppercase tracking-wider shrink-0">
                      {plan.badge}
                    </Badge>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  {plan.priceNote && (
                    <span className="text-sm text-muted-foreground">{plan.priceNote}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 shrink-0 ${f.included ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      <span className={f.included ? 'text-foreground' : 'text-muted-foreground/40 line-through'}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Notes */}
                {plan.notes && (
                  <div className="space-y-1 pt-1">
                    {plan.notes.map((note, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3 h-3 shrink-0" />
                        {note}
                      </p>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <Button
                  variant={plan.ctaVariant as any}
                  size="lg"
                  className="w-full"
                  disabled={isCurrentPlan || isLoading || plan.planKey === 'free'}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    <>
                      {plan.cta}
                      {plan.ctaVariant !== 'outline' && <ArrowRight className="w-4 h-4 ml-1" />}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Transparency footer */}
        <div className="mt-8 glass-card p-4 space-y-2">
          <h4 className="font-display font-semibold text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Our Promise
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• No hidden fees — what you see is what you pay</li>
            <li>• The trial is optional and never auto-renews</li>
            <li>• You can upgrade or cancel at any time</li>
            <li>• Free plan is always free, forever</li>
            <li>• Payments powered by PayFast & Yoco 🇿🇦</li>
          </ul>
        </div>
      </div>

      {/* Payment Method Choice Dialog */}
      <Dialog open={!!showPaymentChoice} onOpenChange={(open) => !open && setShowPaymentChoice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Choose Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between"
              onClick={() => showPaymentChoice && handlePayFast(showPaymentChoice)}
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold">PayFast</span>
                <span className="text-xs text-muted-foreground">EFT, Card, SnapScan</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between"
              onClick={() => showPaymentChoice && handleYoco(showPaymentChoice)}
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold">Yoco</span>
                <span className="text-xs text-muted-foreground">Card payments</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Pricing;
