import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Image, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploaderProps {
  onUpload: (uploaded: boolean) => void;
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
        setPhotoPreview(e.target?.result as string);
        onUpload(true);
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
    onUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
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
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium mb-1">Drop your photo here</p>
              <p className="text-sm text-muted-foreground">or tap to browse gallery</p>
            </div>
            <Button variant="glow" onClick={(e) => { e.stopPropagation(); openFilePicker(); }}>
              <Image className="w-4 h-4" />
              Choose Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-muted/30 p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={photoPreview} 
                alt="Uploaded photo preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Photo uploaded</p>
              <p className="text-xs text-muted-foreground">Ready for body scan</p>
            </div>
            <button 
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <Button 
            variant="gradient" 
            size="lg" 
            className="w-full mt-4"
            onClick={onStartScan}
          >
            Start Body Scan
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Your photos are encrypted and never shared</span>
      </div>
    </div>
  );
};

export default PhotoUploader;
