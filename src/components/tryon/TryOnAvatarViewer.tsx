import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw, User, UserRound, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onDeleteAvatar?: () => void;
  onViewChange?: (view: ViewType) => void;
  onViewGenerated?: (view: ViewType, url: string) => void;
  avatarViews?: AvatarViews;
  className?: string;
}

const PROGRESS_STEPS = [
  'Preparing images…',
  'Analyzing clothing…',
  'Fitting to your body…',
  'Rendering try-on…',
  'Almost done…',
];

const TryOnProgressOverlay = ({ currentItemName }: { currentItemName?: string | null }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = PROGRESS_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i === 0 ? 0 : i * 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="text-center max-w-[200px]">
        <div className="relative mx-auto w-14 h-14 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 animate-ping absolute inset-0" />
          <div className="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center relative">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          {PROGRESS_STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2 text-xs transition-all duration-300',
                i < step ? 'text-primary' : i === step ? 'text-foreground font-medium' : 'text-muted-foreground/40'
              )}
            >
              {i < step ? (
                <Check className="w-3 h-3 text-primary shrink-0" />
              ) : i === step ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <span className="w-3 h-3 shrink-0" />
              )}
              {label}
            </div>
          ))}
        </div>
        {currentItemName && (
          <p className="text-[10px] text-muted-foreground">{currentItemName}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-2">~10–15 seconds</p>
      </div>
    </div>
  );
};

const TryOnAvatarViewer = ({
  avatarUrl,
  tryOnUrl,
  isTryingOn,
  isLoading,
  hasAvatar,
  currentItemName,
  onClearTryOn,
  onCreateAvatar,
  onDeleteAvatar,
  onViewChange,
  onViewGenerated,
  avatarViews,
  className = '',
}: TryOnAvatarViewerProps) => {
  const [currentView, setCurrentView] = useState<ViewType>('front');
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [generatingView, setGeneratingView] = useState<ViewType | null>(null);
  const [localViews, setLocalViews] = useState<AvatarViews>({
    front: null,
    side: null,
    back: null,
  });

  // Merge external and local views
  const mergedViews: AvatarViews = {
    front: avatarViews?.front || localViews.front || avatarUrl,
    side: avatarViews?.side || localViews.side,
    back: avatarViews?.back || localViews.back,
  };

  // Determine which image to display based on current view and try-on state
  useEffect(() => {
    if (tryOnUrl) {
      setDisplayImage(tryOnUrl);
    } else if (mergedViews[currentView]) {
      setDisplayImage(mergedViews[currentView]);
    } else if (avatarUrl) {
      setDisplayImage(avatarUrl);
    } else {
      setDisplayImage(null);
    }
  }, [tryOnUrl, avatarUrl, currentView, mergedViews.front, mergedViews.side, mergedViews.back]);

  // Generate a specific view dynamically
  const generateView = useCallback(async (view: ViewType) => {
    if (!avatarUrl) {
      toast.error('No avatar available to generate view');
      return;
    }

    // Don't regenerate if we already have this view
    if (mergedViews[view]) {
      return;
    }

    setGeneratingView(view);
    
    try {
      console.log(`Generating ${view} view...`);
      
      const { data, error } = await supabase.functions.invoke('generate-avatar-views', {
        body: { 
          imageUrl: avatarUrl,
          view: view 
        }
      });

      if (error) {
        console.error('View generation error:', error);
        throw error;
      }

      if (data?.viewUrl) {
        console.log(`${view} view generated successfully`);
        
        // Store locally
        setLocalViews(prev => ({
          ...prev,
          [view]: data.viewUrl
        }));
        
        // Notify parent to persist
        onViewGenerated?.(view, data.viewUrl);
        
        toast.success(`${view.charAt(0).toUpperCase() + view.slice(1)} view generated!`);
      }
    } catch (error: any) {
      console.error(`Failed to generate ${view} view:`, error);
      
      if (error?.status === 429) {
        toast.error('Rate limit reached. Please wait a moment.');
      } else if (error?.status === 402) {
        toast.error('AI credits needed. Please add funds.');
      } else {
        toast.error(`Could not generate ${view} view`);
      }
    } finally {
      setGeneratingView(null);
    }
  }, [avatarUrl, mergedViews, onViewGenerated]);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    onViewChange?.(view);

    // If this view hasn't been generated yet, generate it
    if (!mergedViews[view] && view !== 'front') {
      generateView(view);
    }
  }, [onViewChange, mergedViews, generateView]);

  const isCurrentViewLoading = generatingView === currentView;

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
            disabled={generatingView !== null}
            className={cn(
              "px-3 py-1.5 rounded-l-full text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'front'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground',
              generatingView !== null && 'opacity-50 cursor-not-allowed'
            )}
          >
            <User className="w-3 h-3" />
            Front
            {generatingView === 'front' && <Loader2 className="w-2 h-2 animate-spin" />}
          </button>
          <button
            onClick={() => handleViewChange('side')}
            disabled={generatingView !== null}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'side'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground',
              generatingView !== null && 'opacity-50 cursor-not-allowed'
            )}
          >
            <UserRound className="w-3 h-3" />
            Side
            {generatingView === 'side' && <Loader2 className="w-2 h-2 animate-spin" />}
            {!mergedViews.side && generatingView !== 'side' && (
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" title="Click to generate" />
            )}
          </button>
          <button
            onClick={() => handleViewChange('back')}
            disabled={generatingView !== null}
            className={cn(
              "px-3 py-1.5 rounded-r-full text-xs font-medium transition-all flex items-center gap-1.5",
              currentView === 'back'
                ? 'bg-primary text-primary-foreground'
                : 'glass-card text-muted-foreground hover:text-foreground',
              generatingView !== null && 'opacity-50 cursor-not-allowed'
            )}
          >
            <User className="w-3 h-3 rotate-180" />
            Back
            {generatingView === 'back' && <Loader2 className="w-2 h-2 animate-spin" />}
            {!mergedViews.back && generatingView !== 'back' && (
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" title="Click to generate" />
            )}
          </button>
        </div>
      )}

      {/* Avatar/Try-on image */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4 pt-14">
        {displayImage ? (
          <div className="relative">
            {/* Loading overlay for view generation */}
            {isCurrentViewLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 rounded-xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 animate-ping absolute inset-0" />
                    <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center relative">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <span className="text-sm font-medium">Generating {currentView} view...</span>
                  <span className="text-xs text-muted-foreground">This may take a moment</span>
                </div>
              </div>
            )}

            <img
              src={displayImage}
              alt={`Your avatar - ${currentView} view`}
              className={cn(
                "max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300",
                isTryingOn && "opacity-50 scale-95",
                isCurrentViewLoading && "opacity-30"
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

      {/* Loading overlay for try-on with progress steps */}
      {isTryingOn && <TryOnProgressOverlay currentItemName={currentItemName} />}

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
      {!tryOnUrl && !isTryingOn && hasAvatar && !isCurrentViewLoading && (
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
      {hasAvatar && !isTryingOn && !isCurrentViewLoading && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
          {onDeleteAvatar && (
            <button
              onClick={onDeleteAvatar}
              className="flex items-center gap-1 px-2 py-1 rounded-full glass-card text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete avatar"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
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
