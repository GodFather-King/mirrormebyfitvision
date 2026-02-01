import { useState, useEffect } from 'react';
import { Loader2, Sparkles, RefreshCw, User, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ViewType = 'front' | 'side' | 'back';

interface AvatarViews {
  front: string | null;
  side: string | null;
  back: string | null;
}

interface TryOnAvatarViewerProps {
  avatarUrl: string | null;
  tryOnUrl: string | null;
  isTryingOn: boolean;
  isLoading: boolean;
  hasAvatar: boolean;
  currentItemName?: string | null;
  onClearTryOn?: () => void;
  onCreateAvatar?: () => void;
  onViewChange?: (view: ViewType) => void;
  avatarViews?: AvatarViews;
  isLoadingViews?: {
    front: boolean;
    side: boolean;
    back: boolean;
  };
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
  onViewChange,
  avatarViews,
  isLoadingViews,
  className = '',
}: TryOnAvatarViewerProps) => {
  const [currentView, setCurrentView] = useState<ViewType>('front');
  const [displayImage, setDisplayImage] = useState<string | null>(null);

  // Determine which image to display based on current view and try-on state
  useEffect(() => {
    if (tryOnUrl) {
      // When trying on, show the try-on result
      setDisplayImage(tryOnUrl);
    } else if (avatarViews && avatarViews[currentView]) {
      // Show the specific view if available
      setDisplayImage(avatarViews[currentView]);
    } else if (avatarUrl) {
      // Fallback to main avatar URL
      setDisplayImage(avatarUrl);
    } else {
      setDisplayImage(null);
    }
  }, [tryOnUrl, avatarUrl, avatarViews, currentView]);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    onViewChange?.(view);
  };

  const isCurrentViewLoading = isLoadingViews?.[currentView] ?? false;

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
    <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden", className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10" />
      
      {/* Ambient lighting effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/15 rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      </div>

      {/* View selector buttons - Top */}
      {!isTryingOn && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          <button
            onClick={() => handleViewChange('front')}
            className={cn(
              "px-3 py-1.5 rounded-l-full text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'front'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-3 h-3" />
            Front
            {isLoadingViews?.front && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
          <button
            onClick={() => handleViewChange('side')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'side'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            )}
          >
            <UserRound className="w-3 h-3" />
            Side
            {isLoadingViews?.side && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
          <button
            onClick={() => handleViewChange('back')}
            className={cn(
              "px-3 py-1.5 rounded-r-full text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'back'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-3 h-3 rotate-180" />
            Back
            {isLoadingViews?.back && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
        </div>
      )}

      {/* Avatar/Try-on image */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4 pt-14">
        {displayImage ? (
          <div className="relative">
            {/* Loading overlay for view generation */}
            {isCurrentViewLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Generating {currentView} view...</span>
                </div>
              </div>
            )}

            <img
              src={displayImage}
              alt={`Your avatar - ${currentView} view`}
              className={cn(
                "max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300",
                isTryingOn && "opacity-50 scale-95",
                isCurrentViewLoading && "opacity-50"
              )}
            />
            
            {/* Edge glow effect */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                boxShadow: 'inset 0 0 40px hsl(var(--primary) / 0.15), 0 0 60px hsl(var(--primary) / 0.1)',
              }}
            />

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
          <div className="w-48 h-64 bg-muted/30 rounded-xl flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Loading overlay for try-on */}
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

      {/* Try-on badge and clear button */}
      {tryOnUrl && !isTryingOn && (
        <>
          <div className="absolute top-14 left-3 z-20">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              Virtual Try-On
            </div>
          </div>
          {onClearTryOn && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearTryOn}
              className="absolute top-14 right-3 z-20"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </>
      )}

      {/* Current view indicator */}
      {!tryOnUrl && !isTryingOn && hasAvatar && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View • Select an item to try on
            </span>
          </div>
        </div>
      )}

      {/* 3D Ready badge */}
      {hasAvatar && !isTryingOn && (
        <div className="absolute bottom-3 right-3 z-20">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full glass-card text-[10px] font-medium text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            3D Avatar Ready
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnAvatarViewer;
