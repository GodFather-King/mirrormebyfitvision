import { useState, useEffect } from 'react';
import { Loader2, Sparkles, RefreshCw, User } from 'lucide-react';
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

  // Smooth transition between images
  useEffect(() => {
    if (tryOnUrl) {
      setDisplayImage(tryOnUrl);
    } else if (avatarUrl) {
      setDisplayImage(avatarUrl);
    }
  }, [tryOnUrl, avatarUrl]);

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

      {/* Avatar/Try-on image */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        {displayImage ? (
          <img
            src={displayImage}
            alt="Your avatar"
            className={cn(
              "max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-500",
              isTryingOn && "opacity-50 scale-95"
            )}
          />
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

      {/* Try-on badge and clear button */}
      {tryOnUrl && !isTryingOn && (
        <>
          <div className="absolute top-3 left-3 z-20">
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
              className="absolute top-3 right-3 z-20"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </>
      )}

      {/* Ready indicator when no try-on */}
      {!tryOnUrl && !isTryingOn && hasAvatar && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
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
