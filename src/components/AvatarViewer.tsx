import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Loader2, User, UserRound, Hand } from 'lucide-react';

interface AvatarViewerProps {
  isScanning?: boolean;
  hasClothing?: boolean;
  selectedClothing?: string | null;
  userPhoto?: string | null;
  avatarImage?: string | null;
  isGeneratingAvatar?: boolean;
  avatarViews?: {
    front: string | null;
    side: string | null;
    back: string | null;
  };
  isLoadingViews?: {
    front: boolean;
    side: boolean;
    back: boolean;
  };
  onViewChange?: (view: 'front' | 'side' | 'back') => void;
}

type PoseView = 'front' | 'side' | 'back';

const AvatarViewer = ({ 
  isScanning = false, 
  hasClothing = false, 
  selectedClothing, 
  userPhoto,
  avatarImage,
  isGeneratingAvatar = false,
  avatarViews,
  isLoadingViews,
  onViewChange
}: AvatarViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [currentPose, setCurrentPose] = useState<PoseView>('front');
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, rotation: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the appropriate image for the current view
  const getCurrentViewImage = useCallback(() => {
    if (avatarViews) {
      return avatarViews[currentPose] || avatarImage || userPhoto;
    }
    return avatarImage || userPhoto;
  }, [avatarViews, currentPose, avatarImage, userPhoto]);

  const displayImage = getCurrentViewImage();
  const isLoadingCurrentView = isLoadingViews?.[currentPose] ?? false;

  // Handle drag-based rotation
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, rotation });
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - dragStart.x;
    const newRotation = (dragStart.rotation + delta * 0.5) % 360;
    setRotation(newRotation);
    
    // Determine which view to show based on rotation
    const normalizedRotation = ((newRotation % 360) + 360) % 360;
    let newPose: PoseView = 'front';
    if (normalizedRotation > 45 && normalizedRotation <= 135) {
      newPose = 'side';
    } else if (normalizedRotation > 135 && normalizedRotation <= 225) {
      newPose = 'back';
    } else if (normalizedRotation > 225 && normalizedRotation <= 315) {
      newPose = 'side';
    }
    
    if (newPose !== currentPose) {
      setCurrentPose(newPose);
      onViewChange?.(newPose);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handlePoseChange = (pose: PoseView) => {
    setCurrentPose(pose);
    const angles: Record<PoseView, number> = { front: 0, side: 90, back: 180 };
    setRotation(angles[pose]);
    onViewChange?.(pose);
  };

  const handleRotate = () => {
    const poses: PoseView[] = ['front', 'side', 'back'];
    const currentIndex = poses.indexOf(currentPose);
    const nextPose = poses[(currentIndex + 1) % poses.length];
    handlePoseChange(nextPose);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[3/4] glass-card flex items-center justify-center overflow-hidden select-none"
      onMouseDown={displayImage ? handleMouseDown : undefined}
      onMouseMove={displayImage ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={displayImage ? handleTouchStart : undefined}
      onTouchMove={displayImage ? handleTouchMove : undefined}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: displayImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10" />
      
      {/* 3D Stage lighting effect */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-2xl" />
      </div>
      
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

      {/* Pose selector - show when avatar is ready */}
      {!isScanning && !isGeneratingAvatar && displayImage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); handlePoseChange('front'); }}
            className={`px-3 py-1.5 rounded-l-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentPose === 'front'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3 h-3" />
            Front
            {isLoadingViews?.front && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePoseChange('side'); }}
            className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentPose === 'side'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserRound className="w-3 h-3" />
            Side
            {isLoadingViews?.side && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePoseChange('back'); }}
            className={`px-3 py-1.5 rounded-r-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentPose === 'back'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3 h-3 rotate-180" />
            Back
            {isLoadingViews?.back && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
        </div>
      )}

      {/* Drag hint */}
      {!isScanning && !isGeneratingAvatar && displayImage && !isDragging && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 glass-card rounded-full text-[10px] text-muted-foreground z-20 animate-pulse">
          <Hand className="w-3 h-3" />
          Drag to rotate
        </div>
      )}

      {/* 3D Avatar Display with view-based transitions */}
      <div 
        className="relative z-10 transition-all duration-500 ease-out"
        style={{ 
          transform: `perspective(1200px) rotateY(${rotation * 0.1}deg) scale(${zoom})`,
          transformStyle: 'preserve-3d',
        }}
      >
        {displayImage ? (
          <div className="relative">
            {/* Loading overlay for view generation */}
            {isLoadingCurrentView && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Generating {currentPose} view...</span>
                </div>
              </div>
            )}

            {/* Main avatar with 3D effect */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img 
                src={displayImage}
                alt={`3D Avatar - ${currentPose} view`}
                className="h-[320px] w-auto object-contain transition-opacity duration-300"
                style={{
                  opacity: isLoadingCurrentView ? 0.5 : 1,
                  filter: (isScanning || isGeneratingAvatar)
                    ? 'brightness(1.2) contrast(1.1) saturate(0.8)' 
                    : 'brightness(1.0) contrast(1.05)',
                }}
                draggable={false}
              />
              
              {/* 3D depth shadow */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 40%, hsl(var(--background) / 0.3) 100%)',
                }}
              />

              {/* Edge glow effect */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  boxShadow: 'inset 0 0 40px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.2)',
                }}
              />

              {/* View-specific measurement points */}
              {!isScanning && !isGeneratingAvatar && !isLoadingCurrentView && (
                <MeasurementPoints pose={currentPose} />
              )}
            </div>

            {/* Floor reflection */}
            <div 
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
          </div>
        ) : (
          <div className="h-[320px] w-48 rounded-2xl bg-muted/50 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No photo</span>
          </div>
        )}
      </div>

      {/* Rotation indicator */}
      {displayImage && (
        <div className="absolute top-20 right-4 flex flex-col items-center gap-1 z-20">
          <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center">
            <div 
              className="w-8 h-8 rounded-full border-2 border-primary/50 relative"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(rotation % 360)}°</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(Math.max(0.5, zoom - 0.1)); }}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleRotate(); }}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(Math.min(1.5, zoom + 0.1)); }}
          className="w-10 h-10 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Status indicators */}
      {isScanning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full z-20">
          <span className="text-xs text-primary font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Analyzing body...
          </span>
        </div>
      )}

      {isGeneratingAvatar && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full z-20">
          <span className="text-xs text-primary font-medium flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Creating 3D Avatar...
          </span>
        </div>
      )}

      {!isScanning && !isGeneratingAvatar && displayImage && !isLoadingCurrentView && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1 glass-card rounded-full text-xs text-green-400 flex items-center gap-1 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          3D Avatar Ready
        </div>
      )}
    </div>
  );
};

// Measurement points component
const MeasurementPoints = ({ pose }: { pose: PoseView }) => {
  const points = {
    front: [
      { top: '15%', left: '50%', size: 'w-3 h-3', color: 'bg-primary', delay: '0s', label: 'Head' },
      { top: '35%', left: '25%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.2s', label: 'Shoulder' },
      { top: '35%', left: '75%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.2s', label: 'Shoulder' },
      { top: '45%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.4s', label: 'Chest' },
      { top: '55%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.6s', label: 'Waist' },
      { top: '65%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.8s', label: 'Hips' },
    ],
    side: [
      { top: '15%', left: '50%', size: 'w-3 h-3', color: 'bg-primary', delay: '0s', label: 'Head' },
      { top: '35%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.2s', label: 'Shoulder Depth' },
      { top: '45%', left: '40%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.4s', label: 'Chest Depth' },
      { top: '55%', left: '45%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.6s', label: 'Waist Depth' },
      { top: '65%', left: '42%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.8s', label: 'Hip Depth' },
    ],
    back: [
      { top: '15%', left: '50%', size: 'w-3 h-3', color: 'bg-primary', delay: '0s', label: 'Head' },
      { top: '30%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.2s', label: 'Neck' },
      { top: '35%', left: '25%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.3s', label: 'Shoulder Blade' },
      { top: '35%', left: '75%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.3s', label: 'Shoulder Blade' },
      { top: '50%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-secondary', delay: '0.5s', label: 'Back Length' },
      { top: '65%', left: '50%', size: 'w-2.5 h-2.5', color: 'bg-primary', delay: '0.7s', label: 'Lower Back' },
    ],
  };

  return (
    <>
      {points[pose].map((point, i) => (
        <div
          key={`${pose}-${i}`}
          className={`absolute ${point.size} rounded-full ${point.color} body-point`}
          style={{
            top: point.top,
            left: point.left,
            transform: 'translate(-50%, -50%)',
            animationDelay: point.delay,
          }}
          title={point.label}
        />
      ))}
    </>
  );
};

export default AvatarViewer;
