import { MODEL_PRESETS, AESTHETIC_LABELS, ModelPreset, Aesthetic } from '@/lib/studioPresets';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import fCurvyDeep from '@/assets/models/f-curvy-deep.jpg';
import fAthleticBrown from '@/assets/models/f-athletic-brown.jpg';
import fTallDark from '@/assets/models/f-tall-dark.jpg';
import fPlusTan from '@/assets/models/f-plus-tan.jpg';
import mAthleticDeep from '@/assets/models/m-athletic-deep.jpg';
import mTallBrown from '@/assets/models/m-tall-brown.jpg';
import mSlimDark from '@/assets/models/m-slim-dark.jpg';
import nbAthleticBrown from '@/assets/models/nb-athletic-brown.jpg';

const MODEL_PREVIEWS: Record<string, string> = {
  'f-curvy-deep': fCurvyDeep,
  'f-athletic-brown': fAthleticBrown,
  'f-tall-dark': fTallDark,
  'f-plus-tan': fPlusTan,
  'm-athletic-deep': mAthleticDeep,
  'm-tall-brown': mTallBrown,
  'm-slim-dark': mSlimDark,
  'nb-athletic-brown': nbAthleticBrown,
};

interface Props {
  value: ModelPreset | null;
  onChange: (m: ModelPreset) => void;
  aesthetic: Aesthetic;
  onAestheticChange: (a: Aesthetic) => void;
}

const ModelPresetPicker = ({ value, onChange, aesthetic, onAestheticChange }: Props) => {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Aesthetic</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AESTHETIC_LABELS) as Aesthetic[]).map((a) => (
            <button
              key={a}
              onClick={() => onAestheticChange(a)}
              className={cn(
                'px-3 h-8 rounded-full text-xs font-medium border transition-colors',
                aesthetic === a
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {AESTHETIC_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">AI Model</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODEL_PRESETS.map((m) => {
            const active = value?.id === m.id;
            return (
              <Card
                key={m.id}
                onClick={() => onChange(m)}
                className={cn(
                  'p-3 cursor-pointer transition-all relative',
                  active ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground/40',
                )}
              >
                <div className="aspect-square rounded-md mb-2 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold leading-tight">{m.label}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] capitalize">{m.gender}</Badge>
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelPresetPicker;
