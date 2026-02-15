import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Image, Shield, X, Sparkles, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeImageOrientation } from '@/lib/imageUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import avatarSilhouette from '@/assets/avatar-silhouette.png';

interface AvatarCreatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelected: (photoDataUrl: string) => void;
  isProcessing?: boolean;
}

const AvatarCreatorDialog = ({ 
  isOpen, 
  onClose, 
  onPhotoSelected, 
  isProcessing = false 
}: AvatarCreatorDialogProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawUrl = e.target?.result as string;
        try {
          // Normalize orientation via canvas to fix EXIF rotation (horizontal photos)
          const correctedUrl = await normalizeImageOrientation(rawUrl);
          setPhotoPreview(correctedUrl);
        } catch {
          // Fallback to raw if normalization fails
          setPhotoPreview(rawUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = useCallback(() => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleStartScan = () => {
    if (photoPreview) {
      onPhotoSelected(photoPreview);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setPhotoPreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Create Your 3D Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample Avatar Preview Card */}
          {!photoPreview && !isProcessing && (
            <div className="glass-card p-4 relative overflow-hidden">
              <div className="absolute inset-0 holographic-shimmer" />
              <div className="relative flex items-center gap-4">
                <div className="relative w-20 h-28 flex-shrink-0">
                  <img 
                    src={avatarSilhouette} 
                    alt="Sample 3D Avatar" 
                    className="w-full h-full object-contain opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-1">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered Analysis
                  </div>
                  <p className="text-sm font-medium">Your Photo → 3D Avatar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a full-body photo for precise measurements
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isProcessing}
          />

          {isProcessing ? (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="font-medium mb-2">Creating Your 3D Avatar</h3>
              <p className="text-sm text-muted-foreground">
                Analyzing body measurements and generating your digital twin...
              </p>
            </div>
          ) : !photoPreview ? (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={openFilePicker}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center relative">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] text-primary-foreground font-bold">+</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-1">Drop your photo here</p>
                  <p className="text-sm text-muted-foreground">Full-body photo for best results</p>
                </div>
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); openFilePicker(); }}>
                  <Image className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo preview */}
              <div className="relative aspect-[3/4] max-h-64 mx-auto rounded-xl overflow-hidden bg-muted">
                <img 
                  src={photoPreview} 
                  alt="Uploaded photo" 
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary"
                size="lg" 
                onClick={handleStartScan}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate My Avatar
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Your photos are encrypted and never shared</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCreatorDialog;
