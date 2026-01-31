import { Ruler, User, Shirt, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Measurements {
  height_cm: number;
  chest_cm: number;
  waist_cm: number;
  hips_cm: number;
  shoulders_cm: number;
  inseam_cm: number;
  body_type?: string;
}

interface ProfileMeasurementsProps {
  measurements: Measurements | null;
  avatarUrl?: string | null;
  userName?: string;
  onEditProfile?: () => void;
}

const ProfileMeasurements = ({ 
  measurements, 
  avatarUrl, 
  userName = 'My Profile',
  onEditProfile 
}: ProfileMeasurementsProps) => {
  if (!measurements) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No measurements yet</h3>
        <p className="text-muted-foreground text-sm">
          Create your 3D avatar to get accurate body measurements
        </p>
      </div>
    );
  }

  const measurementItems = [
    { label: 'Height', value: measurements.height_cm, unit: 'cm', icon: '📏' },
    { label: 'Chest', value: measurements.chest_cm, unit: 'cm', icon: '👕' },
    { label: 'Waist', value: measurements.waist_cm, unit: 'cm', icon: '📐' },
    { label: 'Hips', value: measurements.hips_cm, unit: 'cm', icon: '👖' },
    { label: 'Shoulders', value: measurements.shoulders_cm, unit: 'cm', icon: '🎽' },
    { label: 'Inseam', value: measurements.inseam_cm, unit: 'cm', icon: '📍' },
  ];

  return (
    <div className="glass-card overflow-hidden">
      {/* Profile header */}
      <div 
        className="p-4 flex items-center gap-4 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onEditProfile}
      >
        <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold truncate">{userName}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs capitalize">
              {measurements.body_type || 'Average'} build
            </Badge>
            <span className="text-xs text-muted-foreground">
              {measurements.height_cm}cm
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>

      {/* Measurements grid */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Ruler className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-sm">Body Measurements</h4>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {measurementItems.map((item) => (
            <div 
              key={item.label}
              className="bg-muted/30 rounded-xl p-3 text-center"
            >
              <span className="text-lg mb-1 block">{item.icon}</span>
              <p className="font-display font-bold text-lg text-foreground">
                {item.value}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">
                  {item.unit}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fit ID */}
      <div className="px-4 pb-4">
        <div className="bg-primary/10 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Shirt className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your Fit ID</p>
            <p className="font-mono font-semibold text-sm text-primary truncate">
              FV-{measurements.height_cm}-{measurements.chest_cm}-{measurements.waist_cm}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileMeasurements;
