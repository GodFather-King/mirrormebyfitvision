import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Image, Shield, X, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import avatarSilhouette from '@/assets/avatar-silhouette.png';

interface PhotoUploaderProps {
  onUpload: (photoUrl: string | null) => void;
  onStartScan: () => void;
}

const PhotoUploader = ({ onUpload, onStartScan }: PhotoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setPhotoPreview(imageUrl);
        onUpload(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

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
    onUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Sample Avatar Preview Card */}
      {!photoPreview && (
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="absolute inset-0 holographic-shimmer" />
          <div className="relative flex items-center gap-4">
            <div className="relative w-24 h-32 flex-shrink-0">
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
              {/* Measurement lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130">
                <line x1="20" y1="40" x2="80" y2="40" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.5" />
                <line x1="30" y1="55" x2="70" y2="55" stroke="hsl(var(--secondary))" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.5" />
                <line x1="35" y1="70" x2="65" y2="70" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.5" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-1">
                <Sparkles className="w-3 h-3" />
                AI-Powered Analysis
              </div>
              <p className="text-sm font-medium">Your Photo → 3D Avatar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a full-body photo and our AI creates an accurate 3D model with precise measurements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Upload Your Photo</h3>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {!photoPreview ? (
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
              <Button variant="glow" onClick={(e) => { e.stopPropagation(); openFilePicker(); }}>
                <Image className="w-4 h-4" />
                Choose from Gallery
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Before/After Preview */}
            <div className="flex items-center gap-4 bg-muted/20 rounded-2xl p-4">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Your Photo</p>
                <div className="w-20 h-24 mx-auto rounded-xl overflow-hidden bg-muted border-2 border-border">
                  <img 
                    src={photoPreview} 
                    alt="Uploaded photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-[2px] bg-gradient-to-r from-primary to-secondary" />
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="w-8 h-[2px] bg-gradient-to-r from-secondary to-primary" />
              </div>
              
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">3D Avatar</p>
                <div className="w-20 h-24 mx-auto rounded-xl overflow-hidden bg-muted/50 border-2 border-primary/30 relative">
                  <img 
                    src={photoPreview} 
                    alt="3D Avatar preview" 
                    className="w-full h-full object-cover opacity-80"
                    style={{ filter: 'brightness(1.1) contrast(1.05)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                  {/* Mini grid overlay */}
                  <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
                    {[...Array(6)].map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    ))}
                    {[...Array(5)].map((_, i) => (
                      <line key={`v${i}`} x1={`${i * 25}%`} y1="0" x2={`${i * 25}%`} y2="100%" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRemove}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
                Remove
              </Button>
              <Button 
                variant="gradient" 
                size="lg" 
                className="flex-1"
                onClick={onStartScan}
              >
                <Sparkles className="w-4 h-4" />
                Start AI Body Scan
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Your photos are encrypted and never shared</span>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploader;
