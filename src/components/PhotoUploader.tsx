import { useState, useCallback } from 'react';
import { Upload, Camera, Image, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploaderProps {
  onUpload: (uploaded: boolean) => void;
  onStartScan: () => void;
}

const PhotoUploader = ({ onUpload, onStartScan }: PhotoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  const handleUpload = useCallback(() => {
    setHasPhoto(true);
    onUpload(true);
  }, [onUpload]);

  const handleRemove = useCallback(() => {
    setHasPhoto(false);
    onUpload(false);
  }, [onUpload]);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold">Upload Your Photo</h3>
      </div>

      {!hasPhoto ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(); }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium mb-1">Drop your photo here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <Button variant="glow" onClick={handleUpload}>
              <Image className="w-4 h-4" />
              Choose Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-muted/30 p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Image className="w-8 h-8 text-primary" />
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
