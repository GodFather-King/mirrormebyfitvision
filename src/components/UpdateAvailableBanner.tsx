import { RefreshCw, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';

const UpdateAvailableBanner = () => {
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setDismissed(false);
    }
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 pt-2 animate-fade-in">
      <div className="max-w-lg md:max-w-6xl mx-auto">
        <div className="glass-card border border-primary/30 bg-primary/10 rounded-xl px-3 py-2 flex items-center gap-3 shadow-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              New version available
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Update now for the latest improvements
            </p>
          </div>
          <Button
            size="sm"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="h-8 px-3 text-xs shrink-0"
          >
            {isUpdating ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Updating</>
            ) : (
              'Update'
            )}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateAvailableBanner;
