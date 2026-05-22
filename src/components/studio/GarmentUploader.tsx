import { useRef, useState } from 'react';
import { Upload, ImageIcon, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  brandId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

const GarmentUploader = ({ userId, brandId, value, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/garments/${brandId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('ai-studio').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('ai-studio').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <Card className="relative aspect-[3/4] max-w-xs overflow-hidden">
        <img src={value} alt="Garment" className="w-full h-full object-contain bg-muted/40" />
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 w-8 h-8"
          onClick={() => onChange(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className="aspect-[3/4] max-w-xs flex flex-col items-center justify-center gap-3 p-6 border-dashed cursor-pointer hover:border-primary/60 transition-colors"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {busy ? (
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Upload clothing photo</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG · transparent background preferred</p>
          </div>
        </>
      )}
    </Card>
  );
};

export default GarmentUploader;
