import { Button } from '@/components/ui/button';
import { Lock, Crown, Zap, Shirt, ScanLine, FolderHeart, Clock, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FullScreenPaywallProps {
  open: boolean;
  onClose: () => void;
  type?: 'try-on' | 'scan';
}

const BENEFITS = [
  { icon: Shirt, text: 'Unlimited virtual try-ons' },
  { icon: ScanLine, text: 'Unlimited clothing scans' },
  { icon: FolderHeart, text: 'Full wardrobe access' },
  { icon: Zap, text: 'Priority AI processing' },
];

const FullScreenPaywall = ({ open, onClose, type = 'try-on' }: FullScreenPaywallProps) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-destructive/10 blur-3xl" />
      </div>

      <div className="relative max-w-sm w-full text-center space-y-6">
        {/* Lock icon */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-destructive" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            🚫 Daily Limit Reached
          </h1>
          <p className="text-muted-foreground text-sm">
            You've used all your free {type === 'scan' ? 'scans' : 'try-ons'} for today.
            Upgrade to Premium for unlimited access.
          </p>
        </div>

        {/* Benefits */}
        <div className="glass-card p-4 space-y-3 text-left">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider text-center">Premium Benefits</p>
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400 font-medium">
          <Flame className="w-3.5 h-3.5" />
          Limited launch offer available
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full bg-gradient-to-r from-primary to-secondary"
            size="xl"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FullScreenPaywall;
