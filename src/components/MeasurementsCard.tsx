import { Ruler, Shield, Check } from 'lucide-react';

interface Measurement {
  label: string;
  value: string;
  unit: string;
}

interface MeasurementsCardProps {
  measurements: Measurement[];
  accuracy: number;
}

const MeasurementsCard = ({ measurements, accuracy }: MeasurementsCardProps) => {
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Body Measurements</h3>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-green-400">{accuracy}% Accurate</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {measurements.map((m, index) => (
          <div 
            key={m.label}
            className="bg-muted/30 rounded-lg p-3 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <p className="font-display font-semibold text-lg">
              {m.value}
              <span className="text-xs text-muted-foreground ml-1">{m.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <Check className="w-3 h-3 text-primary" />
        <span>Data encrypted & stored securely</span>
      </div>
    </div>
  );
};

export default MeasurementsCard;
