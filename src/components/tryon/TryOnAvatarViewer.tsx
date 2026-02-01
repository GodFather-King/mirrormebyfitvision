import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TryOnAvatarViewerProps {
  avatarUrl: string | null;
  tryOnUrl: string | null;
  isTryingOn: boolean;
  isLoading: boolean;
  hasAvatar: boolean;
  currentItemName?: string | null;
  onClearTryOn?: () => void;
  onCreateAvatar?: () => void;
  className?: string;
}

const TryOnAvatarViewer = ({
  avatarUrl,
  tryOnUrl,
  isTryingOn,
  isLoading,
  hasAvatar,
  currentItemName,
  onClearTryOn,
  onCreateAvatar,
  className = '',
}: TryOnAvatarViewerProps) => {
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  
  // 360° rotation state
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, rotX: 0, rotY: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth transition between images
  useEffect(() => {
    if (tryOnUrl) {
      setDisplayImage(tryOnUrl);
    } else if (avatarUrl) {
      setDisplayImage(avatarUrl);
    }
  }, [tryOnUrl, avatarUrl]);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Mouse/Touch handlers for 360° rotation
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY, rotX: rotationX, rotY: rotationY });
  }, [rotationX, rotationY]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    // Horizontal drag = Y-axis rotation (left-right spin)
    // Vertical drag = X-axis rotation (up-down tilt)
    const sensitivity = 0.5;
    setRotationY(dragStart.rotY + deltaX * sensitivity);
    setRotationX(Math.max(-60, Math.min(60, dragStart.rotX - deltaY * sensitivity)));
  }, [isDragging, dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setLastPinchDistance(null);
  }, []);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  // Touch events with pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      setLastPinchDistance(getTouchDistance(e.touches[0], e.touches[1]));
    }
  }, [handleDragStart, getTouchDistance]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && lastPinchDistance !== null) {
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = currentDistance - lastPinchDistance;
      const zoomSensitivity = 0.005;
      setZoom(prev => Math.max(0.5, Math.min(2.5, prev + delta * zoomSensitivity)));
      setLastPinchDistance(currentDistance);
    }
  }, [isDragging, handleDragMove, lastPinchDistance, getTouchDistance]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) handleDragEnd();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragEnd]);

  // Reset rotation
  const handleReset = useCallback(() => {
    setRotationX(0);
    setRotationY(0);
    setZoom(1);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(2.5, prev + 0.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.5, prev - 0.2));
  }, []);

  if (isLoading) {
    return (
      <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden", className)}>
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!hasAvatar) {
    return (
      <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden flex items-center justify-center", className)}>
        <div className="text-center p-6">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">Create Your Avatar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a photo to generate your 3D avatar
          </p>
          {onCreateAvatar && (
            <Button onClick={onCreateAvatar} className="bg-gradient-to-r from-primary to-secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Avatar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full aspect-[3/4] glass-card overflow-hidden select-none touch-none",
        className
      )}
      onMouseDown={displayImage && !isTryingOn ? handleMouseDown : undefined}
      onMouseMove={displayImage && !isTryingOn ? handleMouseMove : undefined}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={displayImage && !isTryingOn ? handleTouchStart : undefined}
      onTouchMove={displayImage && !isTryingOn ? handleTouchMove : undefined}
      onTouchEnd={handleDragEnd}
      style={{ cursor: displayImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10" />
      
      {/* Ambient lighting effects that rotate with avatar */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-100"
        style={{ transform: `rotateY(${rotationY * 0.1}deg)` }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/15 rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      </div>

      {/* 3D Avatar/Try-on image with full rotation */}
      <div 
        className="relative z-10 w-full h-full flex items-center justify-center p-4"
        style={{ perspective: '1200px' }}
      >
        {displayImage ? (
          <div
            className="relative transition-transform duration-75 ease-out"
            style={{
              transform: `
                rotateX(${rotationX}deg) 
                rotateY(${rotationY}deg) 
                scale(${zoom})
              `,
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={displayImage}
              alt="Your avatar"
              className={cn(
                "max-h-[calc(100%-2rem)] max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-300",
                isTryingOn && "opacity-50"
              )}
              draggable={false}
              style={{
                backfaceVisibility: 'hidden',
              }}
            />
            
            {/* 3D depth shadow that moves with rotation */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                background: `linear-gradient(${135 + rotationY * 0.5}deg, transparent 40%, hsl(var(--background) / 0.3) 100%)`,
              }}
            />
            
            {/* Edge glow effect */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                boxShadow: `
                  inset ${rotationY * 0.3}px ${-rotationX * 0.3}px 40px hsl(var(--primary) / 0.2),
                  ${-rotationY * 0.5}px ${rotationX * 0.5}px 60px hsl(var(--primary) / 0.15)
                `,
              }}
            />
            
            {/* Floor reflection */}
            <div 
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
                filter: 'blur(8px)',
                transform: `scaleX(${1 + Math.abs(rotationY) * 0.005})`,
              }}
            />
          </div>
        ) : (
          <div className="w-48 h-64 bg-muted/30 rounded-xl flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isTryingOn && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping absolute inset-0" />
              <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center relative">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium mt-4">Trying on...</p>
            {currentItemName && (
              <p className="text-xs text-muted-foreground mt-1">{currentItemName}</p>
            )}
          </div>
        </div>
      )}

      {/* Rotation indicator - shows current angle */}
      {displayImage && !isTryingOn && (rotationX !== 0 || rotationY !== 0) && (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center">
            <div 
              className="w-6 h-6 rounded-full border-2 border-primary/50 relative"
              style={{ transform: `rotateX(${rotationX * 0.5}deg) rotateY(${rotationY}deg)` }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">
            {Math.round(rotationY % 360)}°
          </span>
        </div>
      )}

      {/* Touch hint for mobile */}
      {displayImage && !isTryingOn && !isDragging && rotationX === 0 && rotationY === 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 glass-card rounded-full text-[10px] text-muted-foreground animate-pulse">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 8V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
            <path d="M10 10.76a2 2 0 0 0-1.11.63L7 14v4l-2 2" />
            <path d="M7 20h10" />
            <path d="M12 22v-2" />
            <path d="M14 10v2a2 2 0 0 0 4 0v-2a2 2 0 0 0-4 0z" />
          </svg>
          Drag to rotate 360°
        </div>
      )}

      {/* Try-on badge and clear button */}
      {tryOnUrl && !isTryingOn && (
        <div className="absolute top-3 left-3 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Virtual Try-On
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {/* Zoom controls */}
        {displayImage && !isTryingOn && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        
        {/* Reset try-on button */}
        {tryOnUrl && !isTryingOn && onClearTryOn && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onClearTryOn(); }}
            className="ml-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Ready indicator when no try-on */}
      {!tryOnUrl && !isTryingOn && hasAvatar && displayImage && (rotationX !== 0 || rotationY !== 0 || zoom !== 1) && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Select an item to try on</span>
          </div>
        </div>
      )}
      
      {!tryOnUrl && !isTryingOn && hasAvatar && displayImage && rotationX === 0 && rotationY === 0 && zoom === 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Select an item to try on</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnAvatarViewer;
