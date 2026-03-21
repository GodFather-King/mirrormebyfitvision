import { useMeasurements } from '@/hooks/useMeasurements';
import { Ruler, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SizeRecommendationBadgeProps {
  clothingType?: string;
  clothingName?: string;
  availableSizes?: string[];
  fitType?: string | null;
  className?: string;
}

const confidenceConfig = {
  perfect: { icon: Check, label: 'Perfect fit', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  good: { icon: Check, label: 'Good fit', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  approximate: { icon: AlertTriangle, label: 'Approx.', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
};

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SizeRecommendationBadge = ({
  clothingType = 'tops',
  clothingName,
  availableSizes,
  fitType,
  className,
}: SizeRecommendationBadgeProps) => {
  const { measurements, loading, getRecommendedSize } = useMeasurements();

  if (loading || !measurements) return null;

  const sizes = availableSizes && availableSizes.length > 0 ? availableSizes : DEFAULT_SIZES;
  const recommendation = getRecommendedSize(clothingType, sizes, fitType);

  if (!recommendation) return null;

  const { icon: Icon, label, color, bg } = confidenceConfig[recommendation.confidence];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-md text-xs font-medium",
        bg
      )}>
        <Ruler className="w-3 h-3 text-primary" />
        <span className="text-foreground">Your size:</span>
        <span className="font-bold text-primary text-sm">{recommendation.size}</span>
        <Icon className={cn("w-3 h-3", color)} />
      </div>
      <span className={cn("text-[9px] text-center", color)}>
        {label} • Based on your measurements
      </span>
    </div>
  );
};

export default SizeRecommendationBadge;
