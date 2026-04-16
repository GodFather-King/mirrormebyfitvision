import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getNextMonday } from '@/hooks/useTryOnUsage';
import { formatTimeUntil, formatResetDate } from '@/lib/resetCountdown';

interface LimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  type?: 'try-on' | 'scan';
}

const LimitReachedModal = ({ open, onClose, type = 'try-on' }: LimitReachedModalProps) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  const reset = getNextMonday(now);
  const countdown = formatTimeUntil(reset, now);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto text-center">
        <DialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-display">
            {type === 'scan' ? 'Weekly Scan Limit Reached' : 'Weekly Try-On Limit Reached'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            {type === 'scan'
              ? "You've used all your free scans for this week."
              : "You've used all your free try-ons for this week."}
            <br />
            Upgrade to Premium for unlimited access — or wait for the weekly reset.
          </DialogDescription>
        </DialogHeader>

        <div className="glass-card p-3 flex items-center gap-3 text-left mt-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Free plan resets in</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{countdown}</p>
            <p className="text-[10px] text-muted-foreground truncate">on {formatResetDate(reset)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full bg-gradient-to-r from-primary to-secondary"
            size="lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LimitReachedModal;
