import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Crown, Star, ArrowRight, Info, Loader2, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// Launch promo config with date window
const LAUNCH_PROMO = {
  promoPrice: 69.99,
  promoPriceDisplay: 'R69.99',
  promoMonths: 3,
  standardPrice: 180,
  standardPriceDisplay: 'R180',
  startDate: new Date('2025-03-13T00:00:00+02:00'), // SAST
  endDate: new Date('2025-04-10T23:59:59+02:00'),   // SAST
};

const isPromoActive = () => {
  const now = new Date();
  return now >= LAUNCH_PROMO.startDate && now <= LAUNCH_PROMO.endDate;
};

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
    name: 'Premium',
    planKey: 'premium',
    price: isPromoActive() ? LAUNCH_PROMO.promoPriceDisplay : LAUNCH_PROMO.standardPriceDisplay,
    amount: isPromoActive() ? LAUNCH_PROMO.promoPrice : LAUNCH_PROMO.standardPrice,
    priceNote: '/month',
    badge: isPromoActive() ? '🚀 Launch Offer' : 'Best Value',
    badgeVariant: 'default',
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
    highlight: true,
  },
];

const LaunchPromoBanner = () => {
  if (!LAUNCH_PROMO.enabled) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border border-primary/30 p-4 mb-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            Founders Launch Offer
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider animate-pulse">
              Limited Time
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get Premium for just <span className="font-bold text-primary">{LAUNCH_PROMO.promoPriceDisplay}/month</span> for your first {LAUNCH_PROMO.promoMonths} months, then {LAUNCH_PROMO.standardPriceDisplay}/month.
          </p>
        </div>
      </div>
    </div>
  );
};

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('pricing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  
  const { user } = useAuth();

  // Check for payment result in URL and activate subscription
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success' && user) {
      const purchasedPlan = localStorage.getItem('pending_plan');
      if (purchasedPlan) {
        localStorage.removeItem('pending_plan');
        const activateSub = async () => {
          try {
            const response = await supabase.functions.invoke('verify-payment', {
              body: { plan: purchasedPlan },
            });
            if (response.error) throw new Error(response.error.message);
            setCurrentPlan(purchasedPlan);
            toast.success('Payment successful! Your plan has been upgraded.');
          } catch (err: any) {
            console.error('Failed to activate subscription:', err);
            toast.error('Payment received but activation failed. Please contact support.');
          }
        };
        activateSub();
      } else {
        toast.success('Payment successful! Your plan has been upgraded.');
      }
    } else if (paymentResult === 'cancelled') {
      toast.error('Payment was cancelled.');
    } else if (paymentResult === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, [searchParams, user]);

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

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.planKey === 'free') return;
    if (!user) {
      toast.error('Please sign in to upgrade your plan.');
      navigate('/auth');
      return;
    }
    setLoadingPlan(plan.planKey);
    try {
      localStorage.setItem('pending_plan', plan.planKey);
      
      const response = await supabase.functions.invoke('yoco-checkout', {
        body: {
          plan: plan.planKey,
          amount: plan.amount.toString(),
          itemName: LAUNCH_PROMO.enabled
            ? `MirrorMe ${plan.name} — Launch Offer`
            : `MirrorMe ${plan.name}`,
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
      console.error('Payment error:', error);
      localStorage.removeItem('pending_plan');
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

        {/* Launch Promo Banner */}
        <LaunchPromoBanner />

        {/* Plans */}
        <div className="space-y-5">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.planKey;
            const isLoading = loadingPlan === plan.planKey;
            const planOrder = { free: 0, premium: 1 };
            const isDowngrade = planOrder[plan.planKey as keyof typeof planOrder] <= planOrder[currentPlan as keyof typeof planOrder] && !isCurrentPlan;
            const isPremium = plan.planKey === 'premium';

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
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold">{plan.price}</span>
                    {plan.priceNote && (
                      <span className="text-sm text-muted-foreground">{plan.priceNote}</span>
                    )}
                  </div>
                  {/* Promo pricing detail for Premium */}
                  {isPremium && LAUNCH_PROMO.enabled && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-muted-foreground line-through">
                        {LAUNCH_PROMO.standardPriceDisplay}/month
                      </p>
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        First {LAUNCH_PROMO.promoMonths} months at this price, then {LAUNCH_PROMO.standardPriceDisplay}/month
                      </p>
                    </div>
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
                  disabled={isCurrentPlan || isLoading || plan.planKey === 'free' || isDowngrade}
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
            <li>• You can upgrade or cancel at any time</li>
            <li>• Free plan is always free, forever</li>
            <li>• Payments powered by Yoco 🇿🇦</li>
            {LAUNCH_PROMO.enabled && (
              <li>• Launch offer: {LAUNCH_PROMO.promoPriceDisplay}/month for {LAUNCH_PROMO.promoMonths} months, then {LAUNCH_PROMO.standardPriceDisplay}/month</li>
            )}
          </ul>
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Pricing;
