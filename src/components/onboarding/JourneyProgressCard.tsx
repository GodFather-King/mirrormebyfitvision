import { Camera, Shirt, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface JourneyProgressCardProps {
  hasAvatar: boolean;
  hasWardrobeItem: boolean;
  hasTriedOn: boolean;
  onAction: (step: 'avatar' | 'wardrobe' | 'tryon') => void;
}

/**
 * Persistent progress card showing the user where they are in the
 * 3-step journey. Only visible until all 3 steps are done.
 */
const JourneyProgressCard = ({
  hasAvatar,
  hasWardrobeItem,
  hasTriedOn,
  onAction,
}: JourneyProgressCardProps) => {
  const steps = [
    { key: 'avatar' as const, label: 'Create avatar', done: hasAvatar, icon: Camera },
    { key: 'wardrobe' as const, label: 'Add clothes', done: hasWardrobeItem, icon: Shirt },
    { key: 'tryon' as const, label: 'First try-on', done: hasTriedOn, icon: Sparkles },
  ];

  const completed = steps.filter(s => s.done).length;
  const progress = (completed / steps.length) * 100;

  // Hide once all steps are completed
  if (completed === steps.length) return null;

  // Find the first incomplete step
  const nextStep = steps.find(s => !s.done)!;
  const NextIcon = nextStep.icon;

  return (
    <div className="glass-card border border-primary/30 p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Your Journey
        </h3>
        <span className="text-xs font-medium text-primary">
          {completed}/{steps.length} complete
        </span>
      </div>

      <Progress value={progress} className="h-1.5 mb-3" />

      {/* Step pills */}
      <div className="flex items-center justify-between gap-1 mb-3">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  s.done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] truncate ${s.done ? 'text-foreground line-through opacity-60' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {idx < steps.length - 1 && <div className="h-px bg-border flex-1 min-w-2" />}
            </div>
          );
        })}
      </div>

      {/* Next-step CTA */}
      <Button
        size="sm"
        onClick={() => onAction(nextStep.key)}
        className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs h-9 group"
      >
        <NextIcon className="w-3.5 h-3.5 mr-1.5" />
        Next: {nextStep.label}
        <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    </div>
  );
};

export default JourneyProgressCard;
