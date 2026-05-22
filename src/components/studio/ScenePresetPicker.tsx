import { SCENE_PRESETS, SCENE_CATEGORIES, ScenePreset } from '@/lib/studioPresets';
import { Card } from '@/components/ui/card';
import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: ScenePreset | null;
  onChange: (s: ScenePreset) => void;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Urban: 'from-cyan-500/30 via-blue-700/30 to-slate-900/70',
  Township: 'from-amber-500/30 via-rose-600/30 to-purple-900/70',
  Shopping: 'from-fuchsia-500/30 via-purple-700/30 to-slate-900/70',
  Nature: 'from-orange-500/30 via-pink-600/30 to-rose-900/70',
};

const ScenePresetPicker = ({ value, onChange }: Props) => {
  return (
    <div className="space-y-6">
      {SCENE_CATEGORIES.map((cat) => {
        const items = SCENE_PRESETS.filter((s) => s.category === cat);
        return (
          <div key={cat}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {cat}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((s) => {
                const active = value?.id === s.id;
                return (
                  <Card
                    key={s.id}
                    onClick={() => onChange(s)}
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden cursor-pointer transition-all',
                      active ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-muted-foreground/30',
                    )}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENTS[cat]}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    {active && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <p className="text-xs font-semibold leading-tight">{s.label}</p>
                      <p className="text-[10px] text-white/70 line-clamp-2 mt-0.5">{s.description}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground italic">
        All environments are South African–inspired and avoid real-world brand or mall names.
      </p>
    </div>
  );
};

export default ScenePresetPicker;
