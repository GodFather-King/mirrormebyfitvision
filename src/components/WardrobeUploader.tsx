import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = [
  { value: 'tops', label: 'Tops' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessories', label: 'Accessories' },
];

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
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleUpload = async () => {
    if (!user || !selectedFile || !name || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload original image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wardrobe')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe')
        .getPublicUrl(fileName);

      console.log('Image uploaded:', publicUrl);

      // 2. Process the clothing image for 3D try-on
      setIsProcessing(true);
      let processedImageUrl = publicUrl;

      try {
        const { data: processData, error: processError } = await supabase.functions.invoke('process-clothing', {
          body: { imageUrl: publicUrl, category, name }
        });

        if (!processError && processData?.processedImageUrl) {
          processedImageUrl = processData.processedImageUrl;
          console.log('Clothing processed successfully');
        }
      } catch (err) {
        console.log('Processing skipped, using original image');
      }

      setIsProcessing(false);

      // 3. Save to database
      const { error: dbError } = await supabase
        .from('wardrobe_items')
        .insert({
          user_id: user.id,
          name,
          category: category as any,
          original_image_url: publicUrl,
          processed_image_url: processedImageUrl,
          color: color || null,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save item');
      }

      toast.success('Item added to wardrobe!');
      resetForm();
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setName('');
    setCategory('');
    setColor('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-border max-w-md">
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
            <Select value={category} onValueChange={setCategory}>
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
