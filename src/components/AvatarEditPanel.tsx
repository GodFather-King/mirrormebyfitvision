import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AvatarMeasurements } from '@/hooks/useAvatar';

interface AvatarEditPanelProps {
  avatarUrl: string;
  measurements: AvatarMeasurements;
  onAvatarUpdated: (newUrl: string, newMeasurements: AvatarMeasurements) => void;
}

const bodyTypes = ['slim', 'average', 'athletic', 'curvy', 'plus'];
const hairStyles = ['Keep current', 'Short straight', 'Short curly', 'Medium wavy', 'Long straight', 'Long curly', 'Braids', 'Afro', 'Buzz cut', 'Bald'];
const hairColors = ['Keep current', 'Black', 'Dark brown', 'Light brown', 'Blonde', 'Red', 'Auburn', 'Gray', 'White', 'Blue', 'Pink', 'Purple'];

const AvatarEditPanel = ({ avatarUrl, measurements, onAvatarUpdated }: AvatarEditPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [height, setHeight] = useState(measurements.height_cm);
  const [bodyType, setBodyType] = useState(measurements.body_type || 'average');
  const [hairStyle, setHairStyle] = useState('Keep current');
  const [hairColor, setHairColor] = useState('Keep current');
  const [skinToneAdjust, setSkinToneAdjust] = useState(0); // -2 to +2

  const hasChanges = 
    height !== measurements.height_cm ||
    bodyType !== (measurements.body_type || 'average') ||
    hairStyle !== 'Keep current' ||
    hairColor !== 'Keep current' ||
    skinToneAdjust !== 0;

  const handleReset = () => {
    setHeight(measurements.height_cm);
    setBodyType(measurements.body_type || 'average');
    setHairStyle('Keep current');
    setHairColor('Keep current');
    setSkinToneAdjust(0);
  };

  const handleApply = async () => {
    if (!hasChanges) return;
    setIsApplying(true);

    try {
      const editInstructions: string[] = [];

      if (height !== measurements.height_cm) {
        editInstructions.push(`Adjust the person's proportions to reflect a height of ${height}cm (previously ${measurements.height_cm}cm)`);
      }
      if (bodyType !== (measurements.body_type || 'average')) {
        editInstructions.push(`Adjust body shape to appear more ${bodyType}`);
      }
      if (hairStyle !== 'Keep current') {
        editInstructions.push(`Change hairstyle to: ${hairStyle}`);
      }
      if (hairColor !== 'Keep current') {
        editInstructions.push(`Change hair color to: ${hairColor}`);
      }
      if (skinToneAdjust !== 0) {
        const direction = skinToneAdjust > 0 ? 'lighter' : 'darker';
        editInstructions.push(`Make the skin tone slightly ${direction} (subtle adjustment)`);
      }

      const { data, error } = await supabase.functions.invoke('generate-avatar-views', {
        body: {
          imageUrl: avatarUrl,
          view: 'edit',
          editInstructions: editInstructions.join('. ') + '. Keep everything else EXACTLY the same — same face, same clothing, same pose, same background. This must still look like the same person.'
        }
      });

      if (error) {
        console.error('Avatar edit error:', error);
        toast.error('Failed to apply edits');
        return;
      }

      if (data?.viewUrl) {
        const newMeasurements: AvatarMeasurements = {
          ...measurements,
          height_cm: height,
          body_type: bodyType,
        };
        onAvatarUpdated(data.viewUrl, newMeasurements);
        toast.success('Avatar updated!');
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Edit failed:', err);
      toast.error('Failed to edit avatar');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Pencil className="w-4 h-4 mr-2" />
        Edit Avatar
      </Button>
    );
  }

  return (
    <div className="glass-card p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" />
          Edit Avatar
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs">
          Close
        </Button>
      </div>

      {/* Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Height</Label>
          <span className="text-xs text-muted-foreground font-medium">{height} cm</span>
        </div>
        <Slider
          value={[height]}
          onValueChange={([v]) => setHeight(v)}
          min={140}
          max={210}
          step={1}
        />
      </div>

      {/* Body Shape */}
      <div className="space-y-2">
        <Label className="text-xs">Body Shape</Label>
        <Select value={bodyType} onValueChange={setBodyType}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bodyTypes.map(bt => (
              <SelectItem key={bt} value={bt} className="text-xs capitalize">{bt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skin Tone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Skin Tone Adjustment</Label>
          <span className="text-xs text-muted-foreground">
            {skinToneAdjust === 0 ? 'No change' : skinToneAdjust > 0 ? `+${skinToneAdjust} lighter` : `${skinToneAdjust} darker`}
          </span>
        </div>
        <Slider
          value={[skinToneAdjust]}
          onValueChange={([v]) => setSkinToneAdjust(v)}
          min={-2}
          max={2}
          step={1}
        />
      </div>

      {/* Hair Style */}
      <div className="space-y-2">
        <Label className="text-xs">Hair Style</Label>
        <Select value={hairStyle} onValueChange={setHairStyle}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hairStyles.map(hs => (
              <SelectItem key={hs} value={hs} className="text-xs">{hs}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hair Color */}
      <div className="space-y-2">
        <Label className="text-xs">Hair Color</Label>
        <Select value={hairColor} onValueChange={setHairColor}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hairColors.map(hc => (
              <SelectItem key={hc} value={hc} className="text-xs">{hc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={handleReset} className="flex-1 text-xs">
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
        <Button 
          size="sm" 
          onClick={handleApply} 
          disabled={!hasChanges || isApplying}
          className="flex-1 text-xs"
        >
          {isApplying ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Applying...</>
          ) : (
            'Apply Changes'
          )}
        </Button>
      </div>
    </div>
  );
};

export default AvatarEditPanel;
