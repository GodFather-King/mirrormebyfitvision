import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SaveOutfitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  itemIds: string[];
  brandNames?: string[];
  productLinks?: { name: string; url?: string; brand?: string }[];
  tuckState?: { [itemId: string]: 'tucked' | 'untucked' };
  onSaved?: () => void;
}

const SaveOutfitDialog = ({
  isOpen,
  onClose,
  previewUrl,
  itemIds,
  brandNames = [],
  productLinks = [],
  onSaved,
}: SaveOutfitDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save outfits');
      return;
    }
    if (!name.trim()) {
      toast.error('Give your outfit a name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('saved_outfits').insert({
        user_id: user.id,
        name: name.trim(),
        items: itemIds,
        preview_url: previewUrl,
        brand_names: brandNames,
        product_links: productLinks as any,
      });

      if (error) throw error;

      toast.success('Outfit saved! 🎉');
      setName('');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Save outfit error:', err);
      toast.error('Failed to save outfit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Outfit</DialogTitle>
          <DialogDescription>Save this look to your collection</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="rounded-lg overflow-hidden bg-muted aspect-[3/4] max-h-48 mx-auto">
            <img
              src={previewUrl}
              alt="Outfit preview"
              className="w-full h-full object-contain"
            />
          </div>

          <Input
            placeholder="e.g. Casual Friday Look"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
          />

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Outfit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveOutfitDialog;
