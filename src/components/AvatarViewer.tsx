import { useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface AvatarViewerProps {
  isScanning?: boolean;
  hasClothing?: boolean;
  selectedClothing?: string | null;
  userPhoto?: string | null;
  avatarImage?: string | null;
  isGeneratingAvatar?: boolean;
}

const AvatarViewer = ({ 
  isScanning = false, 
  hasClothing = false, 
  selectedClothing, 
  userPhoto,
  avatarImage,
  isGeneratingAvatar = false
}: AvatarViewerProps) => {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const handleRotate = () => {
    setRotation((prev) => (prev + 45) % 360);
  };

  // Display the AI-generated avatar if available, otherwise show original photo
  const displayImage = avatarImage || userPhoto;

  return (
    <div className="relative w-full aspect-[3/4] glass-card flex items-center justify-center overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10" />
      
      {/* Scan line animation */}
      {(isScanning || isGeneratingAvatar) && (
        <>
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="pulse-ring w-32 h-32" />
            <div className="pulse-ring w-32 h-32" style={{ animationDelay: '0.5s' }} />
            <div className="pulse-ring w-32 h-32" style={{ animationDelay: '1s' }} />
          </div>
        </>
      )}

      {/* User's Photo as 3D Avatar */}
      <div 
        className="relative z-10 transition-all duration-500"
        style={{ 
          transform: `perspective(1000px) rotateY(${rotation}deg) scale(${zoom})`,
          transformStyle: 'preserve-3d',
        }}
      >
        {displayImage ? (
          <div className="relative">
            {/* Main photo with 3D scan effect */}
            <div className="relative overflow-hidden rounded-2xl">
              <img 
                src={displayImage}
                alt="Your 3D Avatar"
                className="h-[320px] w-auto object-contain"
                style={{
                  filter: (isScanning || isGeneratingAvatar)
                    ? 'brightness(1.2) contrast(1.1) saturate(0.8)' 
                    : avatarImage 
                      ? 'brightness(1.0) contrast(1.0)' 
                      : 'brightness(1.05) contrast(1.05)',
                }}
              />
              
              {/* Holographic overlay effect - only show when not AI-generated */}
              {!avatarImage && (
                <div 
                  className="absolute inset-0 pointer-events-none mix-blend-overlay"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)',
                  }}
                />
              )}
              
              {/* Scan grid overlay - only show during scan or if no AI avatar */}
              {(isScanning || isGeneratingAvatar || !avatarImage) && (
                <div className="absolute inset-0 pointer-events-none opacity-30">
                  <svg className="w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
                    {[...Array(15)].map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="hsl(var(--primary))" strokeWidth="0.3" />
                    ))}
                    {[...Array(10)].map((_, i) => (
                      <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="150" stroke="hsl(var(--primary))" strokeWidth="0.3" />
                    ))}
                  </svg>
                </div>
              )}

              {/* Edge glow effect */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  boxShadow: avatarImage 
                    ? 'inset 0 0 40px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.3)'
                    : 'inset 0 0 30px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.2)',
                }}
              />

              {/* Body measurement points - show when avatar is ready */}
              {!isScanning && !isGeneratingAvatar && avatarImage && (
                <>
                  <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary body-point" title="Head" />
                  <div className="absolute top-[35%] left-[25%] w-2.5 h-2.5 rounded-full bg-secondary body-point" style={{ animationDelay: '0.2s' }} title="Shoulder" />
                  <div className="absolute top-[35%] right-[25%] w-2.5 h-2.5 rounded-full bg-secondary body-point" style={{ animationDelay: '0.2s' }} title="Shoulder" />
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary body-point" style={{ animationDelay: '0.4s' }} title="Chest" />
                  <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-secondary body-point" style={{ animationDelay: '0.6s' }} title="Waist" />
                  <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary body-point" style={{ animationDelay: '0.8s' }} title="Hips" />
                  <div className="absolute top-[75%] left-[35%] w-2 h-2 rounded-full bg-muted-foreground/50 body-point" style={{ animationDelay: '1s' }} title="Thigh" />
                  <div className="absolute top-[75%] right-[35%] w-2 h-2 rounded-full bg-muted-foreground/50 body-point" style={{ animationDelay: '1s' }} title="Thigh" />
                </>
              )}
            </div>

            {/* Reflection effect */}
            <div 
              className="absolute -bottom-2 left-0 right-0 h-16 opacity-20 blur-sm"
              style={{
                background: `url(${displayImage}) center bottom / contain no-repeat`,
                transform: 'scaleY(-0.3)',
                maskImage: 'linear-gradient(to bottom, black, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
              }}
            />
          </div>
        ) : (
          <div className="h-[320px] w-48 rounded-2xl bg-muted/50 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No photo</span>
          </div>
        )}

        {/* Overlay clothing effect */}
        {hasClothing && selectedClothing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full bg-gradient-to-b from-secondary/20 to-primary/20 mix-blend-color rounded-2xl" />
          </div>
        )}
      </div>

      {/* 3D rotation indicator */}
      {rotation !== 0 && (
        <div className="absolute top-4 right-4 px-3 py-1 glass-card rounded-full text-xs text-primary">
          {rotation}°
        </div>
      )}

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
            Analyzing body...
          </span>
        </div>
      )}

      {/* Generating avatar status */}
      {isGeneratingAvatar && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full">
          <span className="text-xs text-primary font-medium flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Creating 3D Avatar...
          </span>
        </div>
      )}

      {/* Scan complete badge */}
      {!isScanning && !isGeneratingAvatar && avatarImage && (
        <div className="absolute top-4 left-4 px-3 py-1 glass-card rounded-full text-xs text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          AI Avatar Ready
        </div>
      )}
    </div>
  );
};

export default AvatarViewer;
