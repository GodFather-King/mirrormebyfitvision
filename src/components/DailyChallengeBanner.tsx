import { useState, useEffect } from 'react';
import { X, Flame, Sparkles, Star, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHALLENGES = [
  { text: "Try 5 outfits today", icon: Flame, emoji: "🔥" },
  { text: "New day, new look — create your best outfit", icon: Sparkles, emoji: "✨" },
  { text: "Mix & match 3 wardrobe items", icon: Shirt, emoji: "👗" },
  { text: "Save your top outfit of the day", icon: Star, emoji: "⭐" },
  { text: "Try something you've never worn before", icon: Flame, emoji: "🔥" },
  { text: "Style a complete outfit — top to bottom", icon: Sparkles, emoji: "💅" },
  { text: "Challenge: Create a look in under 60 seconds", icon: Flame, emoji: "⚡" },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const getDailyChallenge = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return CHALLENGES[dayOfYear % CHALLENGES.length];
};

interface DailyChallengeBannerProps {
  className?: string;
}

const DailyChallengeBanner = ({ className }: DailyChallengeBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lastDismissed = localStorage.getItem('challenge_dismissed_date');
    if (lastDismissed === getToday()) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('challenge_dismissed_date', getToday());
  };

  if (dismissed) return null;

  const challenge = getDailyChallenge();
  const Icon = challenge.icon;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-3 backdrop-blur-sm",
      className
    )}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2.5 pr-6">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Daily Challenge</p>
          <p className="text-xs font-medium text-foreground">
            {challenge.emoji} {challenge.text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeBanner;
