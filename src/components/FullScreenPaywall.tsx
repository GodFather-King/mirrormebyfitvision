import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Zap, Shirt, ScanLine, FolderHeart, CalendarClock, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNextMonday } from '@/hooks/useTryOnUsage';
import { formatTimeUntil, formatResetDate } from '@/lib/resetCountdown';

interface FullScreenPaywallProps {
  open: boolean;
  onClose: () => void; // kept for API compatibility but NOT exposed as a dismiss button
  type?: 'try-on' | 'scan';
}

const BENEFITS = [
  { icon: Shirt, text: 'Unlimited virtual try-ons' },
  { icon: ScanLine, text: 'Unlimited clothing scans' },
  { icon: FolderHeart, text: 'Full wardrobe access' },
  { icon: Zap, text: 'Priority AI processing' },
];

const FullScreenPaywall = React.forwardRef<HTMLDivElement, FullScreenPaywallProps>(
  ({ open, type = 'try-on' }, ref) => {
    const navigate = useNavigate();
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
      if (!open) return;
      const id = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(id);
    }, [open]);

    if (!open) return null;

    const reset = getNextMonday(now);
    const countdown = formatTimeUntil(reset, now);

    return (
      <div ref={ref} className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-destructive/10 blur-3xl" />
        </div>

        <div className="relative max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-destructive" />
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              🚫 {type === 'scan' ? 'Weekly Scan Limit Reached' : 'Weekly Try-On Limit Reached'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {type === 'scan'
                ? "You've used all your free scans for this week."
                : "You've used all your free try-ons for this week."}{' '}
              Upgrade to Premium for unlimited access — or wait for the weekly reset.
            </p>
          </div>

          {/* Hard-wall reset countdown */}
          <div className="glass-card p-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Free plan resets in</p>
              <p className="text-base font-semibold text-foreground tabular-nums">{countdown}</p>
              <p className="text-[10px] text-muted-foreground truncate">on {formatResetDate(reset)}</p>
            </div>
          </div>

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

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-primary to-secondary"
              size="xl"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade Now
            </Button>
            <p className="text-[11px] text-muted-foreground">
              You can keep browsing once your free credits reset.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

FullScreenPaywall.displayName = 'FullScreenPaywall';

export default FullScreenPaywall;
