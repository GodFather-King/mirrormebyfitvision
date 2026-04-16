import { useState, useEffect } from 'react';
import { X, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const getToday = () => new Date().toISOString().slice(0, 10);

interface WelcomeBackBannerProps {
  className?: string;
}

const WelcomeBackBanner = ({ className }: WelcomeBackBannerProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastVisit = localStorage.getItem('last_visit_date');
    const today = getToday();

    if (lastVisit && lastVisit !== today) {
      setShow(true);
    }
    localStorage.setItem('last_visit_date', today);
  }, []);

  if (!show) return null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-primary/10 p-3 backdrop-blur-sm animate-in slide-in-from-top-2 duration-500",
      className
    )}>
      <button
        onClick={() => setShow(false)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2.5 pr-6">
        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">
            🔥 New day, new outfits. Let's style you again!
          </p>
          <p className="text-[10px] text-muted-foreground">Welcome back — keep styling!</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBackBanner;
