import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ImageOff, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAvatar } from '@/hooks/useAvatar';
import { useTryOnWithRetry } from '@/hooks/useTryOnWithRetry';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { logBrandEvent } from '@/lib/brandEvents';
import { useNavigate } from 'react-router-dom';
import ShareLookButton from '@/components/ShareLookButton';
import { downloadWatermarkedImage } from '@/lib/downloadImage';
import { persistTryOnImage } from '@/lib/tryOnHistory';
import { useAuth } from '@/hooks/useAuth';

export interface OutfitItem {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface OutfitTryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OutfitItem[];
  brand: { id: string; name: string } | null;
}

const OutfitTryOnDialog = ({ open, onOpenChange, items, brand }: OutfitTryOnDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { avatarUrl, hasAvatar } = useAvatar();
  const { invoke } = useTryOnWithRetry();
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTryOnUrl(null);
      setError(null);
      setIsTryingOn(false);
    }
  }, [open]);

  const runTryOn = async () => {
    if (!brand || items.length === 0) return;
    if (!hasAvatar || !avatarUrl) return;

    setIsTryingOn(true);
    setError(null);
    setTryOnUrl(null);
    try {
      const avatarPayload = await prepareImageForEdgeFunction(avatarUrl);
      const itemPayloads = await Promise.all(
        items.map(async (it) => ({
          name: it.name,
          category: it.category,
          processedImageUrl: await prepareImageForEdgeFunction(it.image_url),
        }))
      );

      const result = await invoke({
        functionName: 'wardrobe-try-on',
        body: {
          avatarUrl: avatarPayload,
          clothingItems: itemPayloads,
          clothingName: `${brand.name} outfit (${items.length} items)`,
        },
      });

      if (!result?.tryOnUrl) throw new Error('Outfit try-on failed. Please try again.');

      setTryOnUrl(result.tryOnUrl);
      logBrandEvent({
        eventType: 'try_on_clicked',
        brandId: brand.id,
        metadata: { outfit: true, items: items.length },
      });

      if (user) {
        const persisted = await persistTryOnImage({
          userId: user.id,
          imageUrl: result.tryOnUrl,
          source: 'brand_store',
          brandId: brand.id,
          itemName: `${brand.name} outfit`,
          category: 'outfit',
        });
        if (persisted) setTryOnUrl(persisted.imageUrl);
      }
    } catch (err: any) {
      const msg = err?.message || 'Outfit try-on failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsTryingOn(false);
    }
  };

  useEffect(() => {
    if (open && items.length >= 2 && hasAvatar && avatarUrl && !tryOnUrl && !isTryingOn) {
      runTryOn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasAvatar, avatarUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Try on full outfit ({items.length} items)
          </DialogTitle>
        </DialogHeader>

        {!hasAvatar ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Create your avatar first to try on items.</p>
            <Button onClick={() => { onOpenChange(false); navigate('/'); }}>Create Avatar</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative flex items-center justify-center">
              {isTryingOn && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-foreground">Layering your outfit…</p>
                </div>
              )}
              {tryOnUrl ? (
                <img src={tryOnUrl} alt="Your outfit" className="w-full h-full object-cover" />
              ) : error ? (
                <div className="text-center px-6 space-y-3">
                  <ImageOff className="w-10 h-10 text-destructive mx-auto" />
                  <p className="text-xs text-destructive font-medium">{error}</p>
                  <Button size="sm" variant="outline" onClick={runTryOn}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
                  </Button>
                </div>
              ) : (
                avatarUrl && <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover opacity-60" />
              )}
            </div>

            {tryOnUrl && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => downloadWatermarkedImage(tryOnUrl, `mirrorme-outfit.jpg`)}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </Button>
                <ShareLookButton imageUrl={tryOnUrl} itemName="My outfit" variant="outline" size="default" label="Share" />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OutfitTryOnDialog;
