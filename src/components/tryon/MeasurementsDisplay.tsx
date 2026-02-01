import { useAvatar, AvatarMeasurements } from '@/hooks/useAvatar';
import { Ruler, User, ArrowUpDown, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeasurementsDisplayProps {
  measurements?: AvatarMeasurements | null;
  compact?: boolean;
  className?: string;
}

const measurementLabels: Record<keyof Omit<AvatarMeasurements, 'body_type'>, { label: string; icon: string }> = {
  height_cm: { label: 'Height', icon: '📏' },
  chest_cm: { label: 'Chest', icon: '👕' },
  waist_cm: { label: 'Waist', icon: '⭕' },
  hips_cm: { label: 'Hips', icon: '🩳' },
  shoulders_cm: { label: 'Shoulders', icon: '💪' },
  inseam_cm: { label: 'Inseam', icon: '👖' },
};

const bodyTypeLabels: Record<string, string> = {
  slim: 'Slim',
  average: 'Average',
  athletic: 'Athletic',
  curvy: 'Curvy',
};

const formatMeasurement = (value: number, key: string): string => {
  // Convert to both cm and inches for user-friendliness
  const inches = Math.round(value / 2.54);
  
  if (key === 'height_cm') {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${value}cm (${feet}'${remainingInches}")`;
  }
  
  return `${value}cm (${inches}")`;
};

const MeasurementsDisplay = ({ 
  measurements: propMeasurements, 
  compact = false,
  className = '' 
}: MeasurementsDisplayProps) => {
  const { measurements: contextMeasurements } = useAvatar();
  const measurements = propMeasurements ?? contextMeasurements;

  if (!measurements) {
    return (
      <div className={cn("glass-card p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Ruler className="w-4 h-4" />
          <span className="text-sm">Measurements will appear after avatar creation</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("glass-card p-3", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Your Fit ID</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-primary">{measurements.height_cm}</p>
            <p className="text-[10px] text-muted-foreground">Height</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{measurements.chest_cm}</p>
            <p className="text-[10px] text-muted-foreground">Chest</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{measurements.waist_cm}</p>
            <p className="text-[10px] text-muted-foreground">Waist</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-card p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Ruler className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Body Measurements</h3>
            <p className="text-[10px] text-muted-foreground">AI-analyzed from your photo</p>
          </div>
        </div>
        {measurements.body_type && (
          <div className="px-2 py-1 rounded-full bg-secondary/50 text-xs">
            {bodyTypeLabels[measurements.body_type] || measurements.body_type}
          </div>
        )}
      </div>

      {/* Measurements Grid */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(measurementLabels) as Array<keyof typeof measurementLabels>).map((key) => {
          const value = measurements[key];
          const { label, icon } = measurementLabels[key];
          
          return (
            <div 
              key={key}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-base">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium truncate">
                  {formatMeasurement(value, key)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fit ID */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Your Fit ID</span>
          <code className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
            FV-{measurements.height_cm}-{measurements.chest_cm}-{measurements.waist_cm}
          </code>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Share this with brands for instant size matching
        </p>
      </div>
    </div>
  );
};

export default MeasurementsDisplay;
