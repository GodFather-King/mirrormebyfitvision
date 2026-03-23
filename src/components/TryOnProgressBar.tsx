import { Progress } from '@/components/ui/progress';
import { Flame, Trophy, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAILY_GOAL = 5;

const getBadge = (count: number) => {
  if (count >= 10) return { label: 'Style Legend', icon: Crown, color: 'text-yellow-400' };
  if (count >= 5) return { label: 'Style Pro', icon: Trophy, color: 'text-primary' };
  if (count >= 1) return { label: 'Style Starter', icon: Flame, color: 'text-orange-400' };
  return null;
};

interface TryOnProgressBarProps {
  dailyCount: number;
  sessionCount: number;
  isFreePlan: boolean;
  className?: string;
}

const TryOnProgressBar = ({ dailyCount, sessionCount, isFreePlan, className }: TryOnProgressBarProps) => {
  const progress = Math.min(100, (dailyCount / DAILY_GOAL) * 100);
  const badge = getBadge(dailyCount);
  const goalReached = dailyCount >= DAILY_GOAL;

  return (
    <div className={cn("glass-card p-3 space-y-2", className)}>
      {/* Session counter */}
      {sessionCount > 0 && (
        <p className="text-xs text-center font-medium text-foreground">
          You've tried {sessionCount} outfit{sessionCount !== 1 ? 's' : ''} this session 🔥
        </p>
      )}

      {/* Daily goal */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">
            Daily Goal: {dailyCount}/{DAILY_GOAL} outfits
          </span>
          {badge && (
            <span className={cn("flex items-center gap-1 text-[10px] font-semibold", badge.color)}>
              <badge.icon className="w-3 h-3" />
              {badge.label}
            </span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        {goalReached && (
          <p className="text-[10px] text-center text-primary font-medium animate-in fade-in">
            🎉 Daily goal reached! You're on fire!
          </p>
        )}
      </div>
    </div>
  );
};

export default TryOnProgressBar;
