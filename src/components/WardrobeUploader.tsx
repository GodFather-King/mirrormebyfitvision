import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Camera, Ruler } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { compressImageFile } from '@/lib/compressImage';
import { clearWardrobeCache } from '@/lib/wardrobeCache';

const CATEGORIES = [
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

const FIT_TYPES = [
  { value: 'tight', label: 'Tight / Fitted' },
  { value: 'regular', label: 'Regular' },
  { value: 'oversized', label: 'Oversized / Baggy' },
];

// Which measurement fields are relevant per category
const MEASUREMENT_FIELDS_BY_CATEGORY: Record<string, string[]> = {
  tops: ['chest_width_cm', 'waist_width_cm', 'shoulder_width_cm', 'sleeve_length_cm', 'garment_length_cm'],
  outerwear: ['chest_width_cm', 'waist_width_cm', 'shoulder_width_cm', 'sleeve_length_cm', 'garment_length_cm'],
  bottoms: ['waist_width_cm', 'hip_width_cm', 'garment_length_cm'],
  dresses: ['chest_width_cm', 'waist_width_cm', 'hip_width_cm', 'shoulder_width_cm', 'garment_length_cm'],
  shoes: [],
  accessories: [],
};

const MEASUREMENT_LABELS: Record<string, string> = {
  chest_width_cm: 'Chest Width (cm)',
  waist_width_cm: 'Waist Width (cm)',
  hip_width_cm: 'Hip Width (cm)',
  sleeve_length_cm: 'Sleeve Length (cm)',
  shoulder_width_cm: 'Shoulder Width (cm)',
  garment_length_cm: 'Garment Length (cm)',
};

export interface ClothingMeasurements {
  chest_width_cm?: number | null;
  waist_width_cm?: number | null;
  hip_width_cm?: number | null;
  sleeve_length_cm?: number | null;
  shoulder_width_cm?: number | null;
  garment_length_cm?: number | null;
  fit_type: string;
}

interface WardrobeUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WardrobeUploader = ({ isOpen, onClose, onSuccess }: WardrobeUploaderProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [color, setColor] = useState('');
  const [fitType, setFitType] = useState('regular');
  const [clothingMeasurements, setClothingMeasurements] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const relevantFields = MEASUREMENT_FIELDS_BY_CATEGORY[category] || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setClothingMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !name || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Compress image before upload (max 1024px, JPEG 0.8)
      let uploadBlob: Blob;
      try {
        uploadBlob = await compressImageFile(selectedFile, 1024, 0.8);
        console.log(`Compressed: ${selectedFile.size} → ${uploadBlob.size} bytes`);
      } catch {
        uploadBlob = selectedFile; // fallback to original
      }

      // 2. Upload compressed image to storage
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('wardrobe')
        .upload(fileName, uploadBlob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe')
        .getPublicUrl(fileName);

      console.log('Image uploaded:', publicUrl);

      // 2. Build measurement data for DB insert
      const measurementData: Record<string, any> = {
        fit_type: fitType,
      };
      for (const field of relevantFields) {
        const val = clothingMeasurements[field];
        if (val && !isNaN(Number(val))) {
          measurementData[field] = Number(val);
        }
      }

      // 3. Save to database immediately with original image
      const { data: insertedItem, error: dbError } = await supabase
        .from('wardrobe_items')
        .insert({
          user_id: user.id,
          name,
          category: category as any,
          original_image_url: publicUrl,
          processed_image_url: null,
          color: color || null,
          ...measurementData,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save item');
      }

      toast.success('Item added to wardrobe!');
      resetForm();
      onSuccess();
      onClose();

      // 4. Process clothing in background (non-blocking)
      if (insertedItem?.id) {
        supabase.functions.invoke('process-clothing', {
          body: { imageUrl: publicUrl, category, name }
        }).then(({ data: processData, error: processError }) => {
          if (!processError && processData?.processedImageUrl) {
            supabase
              .from('wardrobe_items')
              .update({ processed_image_url: processData.processedImageUrl })
              .eq('id', insertedItem.id)
              .then(() => {
                console.log('Background processing complete for', name);
                onSuccess(); // Refresh to show processed image
              });
          }
        }).catch(() => {
          console.log('Background processing skipped for', name);
        });
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setName('');
    setCategory('');
    setColor('');
    setFitType('regular');
    setClothingMeasurements({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">Add to Wardrobe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Clothing Photo *</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                transition-colors hover:border-primary/50
                ${previewUrl ? 'border-primary' : 'border-border'}
              `}
            >
              {previewUrl ? (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Click to change</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Upload clothing image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g., Blue Denim Jacket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(val) => { setCategory(val); setClothingMeasurements({}); }}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fit Type */}
          <div className="space-y-2">
            <Label>Fit Type *</Label>
            <Select value={fitType} onValueChange={setFitType}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select fit type" />
              </SelectTrigger>
              <SelectContent>
                {FIT_TYPES.map((fit) => (
                  <SelectItem key={fit.value} value={fit.value}>
                    {fit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clothing Measurements */}
          {relevantFields.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Garment Measurements (optional)</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Add measurements for more accurate virtual fitting
              </p>
              <div className="grid grid-cols-2 gap-3">
                {relevantFields.map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{MEASUREMENT_LABELS[field]}</Label>
                    <Input
                      type="number"
                      placeholder="cm"
                      value={clothingMeasurements[field] || ''}
                      onChange={(e) => handleMeasurementChange(field, e.target.value)}
                      className="bg-muted/50 h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color (optional) */}
          <div className="space-y-2">
            <Label htmlFor="item-color">Primary Color (optional)</Label>
            <Input
              id="item-color"
              placeholder="e.g., Navy Blue"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="bg-muted/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || !name || !category || isUploading}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isProcessing ? 'Processing...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WardrobeUploader;
