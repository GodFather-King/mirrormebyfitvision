import { useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import avatarSilhouette from '@/assets/avatar-silhouette.png';

interface AvatarViewerProps {
  isScanning?: boolean;
  hasClothing?: boolean;
  selectedClothing?: string | null;
}

const AvatarViewer = ({ isScanning = false, hasClothing = false, selectedClothing }: AvatarViewerProps) => {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const handleRotate = () => {
    setRotation((prev) => (prev + 45) % 360);
  };

  return (
    <div className="relative w-full aspect-[3/4] glass-card flex items-center justify-center overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10" />
      
      {/* Scan line animation */}
      {isScanning && (
        <>
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="pulse-ring w-32 h-32" />
            <div className="pulse-ring w-32 h-32" style={{ animationDelay: '0.5s' }} />
            <div className="pulse-ring w-32 h-32" style={{ animationDelay: '1s' }} />
          </div>
        </>
      )}

      {/* Avatar */}
      <div 
        className="relative z-10 transition-all duration-500 float-animation"
        style={{ 
          transform: `rotate(${rotation}deg) scale(${zoom})`,
        }}
      >
        <img 
          src={avatarSilhouette}
          alt="3D Avatar"
          className="h-[300px] object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
        />
        
        {/* Overlay clothing effect */}
        {hasClothing && selectedClothing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-b from-secondary/30 to-primary/30 mix-blend-overlay rounded-lg" />
          </div>
        )}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[...Array(10)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="currentColor" strokeWidth="0.2" className="text-primary" />
          ))}
          {[...Array(10)].map((_, i) => (
            <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
          ))}
        </svg>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button 
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={handleRotate}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Scanning status */}
      {isScanning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full">
          <span className="text-xs text-primary font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Scanning body...
          </span>
        </div>
      )}
    </div>
  );
};

export default AvatarViewer;
