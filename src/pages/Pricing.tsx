import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Star, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { useState } from 'react';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
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
    price: '$0',
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
    price: '$1',
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
    cta: 'Start Trial — $1',
    ctaVariant: 'glow',
    highlight: true,
    notes: ['Trial lasts 5 days', 'Automatically expires', 'No auto-renewal'],
  },
  {
    name: 'Premium',
    price: '$10',
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
  const [activeTab, setActiveTab] = useState('pricing');

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
                  onClick={() => {
                    // TODO: wire to payment flow
                  }}
                >
                  {plan.cta}
                  {plan.ctaVariant !== 'outline' && <ArrowRight className="w-4 h-4 ml-1" />}
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
            <li>• The $1 trial is optional and never auto-renews</li>
            <li>• You can upgrade or cancel at any time</li>
            <li>• Free plan is always free, forever</li>
          </ul>
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Pricing;
