import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw, User, UserRound, Trash2, Check, ShoppingBag, ExternalLink } from 'lucide-react';
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
  isRetrying?: boolean;
  isLoading: boolean;
  hasAvatar: boolean;
  currentItemName?: string | null;
  productUrl?: string | null;
  onClearTryOn?: () => void;
  onCreateAvatar?: () => void;
  onDeleteAvatar?: () => void;
  onCancelTryOn?: () => void;
  onViewChange?: (view: ViewType) => void;
  onViewGenerated?: (view: ViewType, url: string) => void;
  avatarViews?: AvatarViews;
  className?: string;
  // Try-on context for multi-view generation
  tryOnContext?: {
    clothingImageUrl: string | null;
    clothingType: string;
    clothingName: string;
  } | null;
}

const PROGRESS_STEPS = [
  'Preparing images…',
  'Analyzing clothing…',
  'Fitting to your body…',
  'Rendering try-on…',
  'Almost done…',
];

interface TryOnProgressOverlayProps {
  currentItemName?: string | null;
  isRetrying?: boolean;
  onCancel?: () => void;
}

const TryOnProgressOverlay = ({ currentItemName, isRetrying, onCancel }: TryOnProgressOverlayProps) => {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Reset on retry
    setStep(0);
    setElapsed(0);
    const timers = PROGRESS_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i === 0 ? 0 : i * 3000)
    );
    const ticker = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(ticker); };
  }, [isRetrying]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="text-center max-w-[220px]">
        <div className="relative mx-auto w-14 h-14 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 animate-ping absolute inset-0" />
          <div className="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center relative">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
        </div>

        {isRetrying && (
          <div className="mb-3 px-3 py-1.5 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium inline-flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            Retrying automatically…
          </div>
        )}

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
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {elapsed}s elapsed · ~10–15 seconds
        </p>
        {elapsed > 20 && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Taking longer than usual — hang tight!
          </p>
        )}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="mt-3 text-xs h-7 text-muted-foreground"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

const TryOnAvatarViewer = ({
  avatarUrl,
  tryOnUrl,
  isTryingOn,
  isRetrying,
  isLoading,
  hasAvatar,
  currentItemName,
  productUrl,
  onClearTryOn,
  onCreateAvatar,
  onDeleteAvatar,
  onCancelTryOn,
  onViewChange,
  onViewGenerated,
  avatarViews,
  className = '',
  tryOnContext,
}: TryOnAvatarViewerProps) => {
  const [currentView, setCurrentView] = useState<ViewType>('front');
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [generatingView, setGeneratingView] = useState<ViewType | null>(null);
  const [failedView, setFailedView] = useState<ViewType | null>(null);
  const [localViews, setLocalViews] = useState<AvatarViews>({
    front: null,
    side: null,
    back: null,
  });
  // Try-on results per view
  const [tryOnViews, setTryOnViews] = useState<AvatarViews>({
    front: null,
    side: null,
    back: null,
  });

  // When a new front try-on arrives, store it and reset other views
  useEffect(() => {
    if (tryOnUrl) {
      setTryOnViews({ front: tryOnUrl, side: null, back: null });
      setCurrentView('front');
    } else {
      setTryOnViews({ front: null, side: null, back: null });
    }
  }, [tryOnUrl]);

  // Merge external and local views
  const mergedViews: AvatarViews = {
    front: avatarViews?.front || localViews.front || avatarUrl,
    side: avatarViews?.side || localViews.side,
    back: avatarViews?.back || localViews.back,
  };

  const hasTryOn = !!tryOnUrl;

  // Determine which image to display based on current view and try-on state
  useEffect(() => {
    if (hasTryOn) {
      const tryOnImage = tryOnViews[currentView] || tryOnViews.front;
      setDisplayImage(tryOnImage);
    } else if (mergedViews[currentView]) {
      setDisplayImage(mergedViews[currentView]);
    } else if (avatarUrl) {
      setDisplayImage(avatarUrl);
    } else {
      setDisplayImage(null);
    }
  }, [hasTryOn, tryOnViews, avatarUrl, currentView, mergedViews.front, mergedViews.side, mergedViews.back]);

  // Generate a try-on view for side/back — single AI call using front avatar + viewAngle
  const generateTryOnView = useCallback(async (view: ViewType) => {
    if (!avatarUrl || !tryOnContext?.clothingImageUrl) return;
    if (tryOnViews[view]) return;

    setGeneratingView(view);
    setFailedView(null);
    try {
      console.log(`Generating ${view} try-on view (single-step)...`);
      const { data, error } = await supabase.functions.invoke('try-on-clothing', {
        body: {
          avatarUrl,
          clothingName: tryOnContext.clothingName,
          clothingType: tryOnContext.clothingType,
          clothingImageUrl: tryOnContext.clothingImageUrl,
          viewAngle: view,
        },
      });
      if (error) throw error;
      if (data?.tryOnUrl) {
        setTryOnViews(prev => ({ ...prev, [view]: data.tryOnUrl }));
        toast.success(`${view.charAt(0).toUpperCase() + view.slice(1)} view ready!`);
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error(`Failed to generate ${view} try-on view:`, error);
      setFailedView(view);
      if (error?.status === 429) {
        toast.error('Rate limit reached. Please wait a moment.');
      } else if (error?.status === 402) {
        toast.error('AI credits needed. Please add funds.');
      } else {
        toast.error(`Could not generate ${view} try-on view. Tap Retry below.`);
      }
    } finally {
      setGeneratingView(null);
    }
  }, [avatarUrl, tryOnContext, tryOnViews]);

  // Generate an avatar-only view
  const generateAvatarView = useCallback(async (view: ViewType) => {
    if (!avatarUrl) {
      toast.error('No avatar available to generate view');
      return;
    }
    if (mergedViews[view]) return;

    setGeneratingView(view);
    try {
      console.log(`Generating ${view} view...`);
      const { data, error } = await supabase.functions.invoke('generate-avatar-views', {
        body: { imageUrl: avatarUrl, view },
      });
      if (error) throw error;
      if (data?.viewUrl) {
        setLocalViews(prev => ({ ...prev, [view]: data.viewUrl }));
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

    if (hasTryOn && view !== 'front') {
      // Generate try-on for this view if not already done
      if (!tryOnViews[view]) {
        generateTryOnView(view);
      }
    } else if (!mergedViews[view] && view !== 'front') {
      generateAvatarView(view);
    }
  }, [onViewChange, hasTryOn, tryOnViews, mergedViews, generateTryOnView, generateAvatarView]);

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

      {/* View selector buttons - Top (visible during try-on too, hidden only while processing) */}
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
            {hasTryOn && !tryOnViews.side && generatingView !== 'side' && (
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" title="Click to generate try-on view" />
            )}
            {!hasTryOn && !mergedViews.side && generatingView !== 'side' && (
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
            {hasTryOn && !tryOnViews.back && generatingView !== 'back' && (
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" title="Click to generate try-on view" />
            )}
            {!hasTryOn && !mergedViews.back && generatingView !== 'back' && (
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
      {isTryingOn && <TryOnProgressOverlay currentItemName={currentItemName} isRetrying={isRetrying} onCancel={onCancelTryOn} />}

      {/* Try-on badge, clear button, and Buy Now */}
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

          {/* Floating Buy Now button */}
          {productUrl && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
              <Button
                size="sm"
                onClick={() => window.open(productUrl, '_blank')}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all animate-in slide-in-from-bottom-2 duration-300 gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                Buy Now
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
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
