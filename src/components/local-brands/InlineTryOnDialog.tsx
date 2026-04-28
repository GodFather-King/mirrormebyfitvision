import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ShoppingBag, ImageOff, Download, RefreshCw, ExternalLink } from 'lucide-react';
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

interface InlineTryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  } | null;
  brand: {
    id: string;
    name: string;
    whatsapp_number: string;
  } | null;
  /** Triggered when the user is ready to order. */
  onWhatsApp: () => void;
  /** Notifies the parent of the latest successful try-on URL so it can be
   *  attached to subsequent orders. */
  onTryOnReady?: (url: string) => void;
  /** When true, renders the action as "Buy on Website" for external stores. */
  isExternal?: boolean;
}

const InlineTryOnDialog = ({
  open,
  onOpenChange,
  item,
  brand,
  onWhatsApp,
  onTryOnReady,
  isExternal = false,
}: InlineTryOnDialogProps) => {
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
    if (!item || !brand) return;
    if (!hasAvatar || !avatarUrl) return;

    setIsTryingOn(true);
    setError(null);
    setTryOnUrl(null);
    try {
      const [avatarPayload, clothingPayload] = await Promise.all([
        prepareImageForEdgeFunction(avatarUrl),
        prepareImageForEdgeFunction(item.image_url),
      ]);

      const result = await invoke({
        functionName: 'try-on-clothing',
        body: {
          avatarUrl: avatarPayload,
          clothingImageUrl: clothingPayload,
          clothingType: item.category,
          clothingName: item.name,
        },
      });

      if (!result?.tryOnUrl) {
        throw new Error('Try-on image failed. Please try again.');
      }

      setTryOnUrl(result.tryOnUrl);
      onTryOnReady?.(result.tryOnUrl);

      // Persist to user profile (storage + try_on_history) so it survives
      // sessions. Best-effort — UI keeps the in-memory URL either way.
      if (user) {
        const persisted = await persistTryOnImage({
          userId: user.id,
          imageUrl: result.tryOnUrl,
          source: 'brand_store',
          brandId: brand.id,
          brandItemId: item.id,
          itemName: item.name,
          category: item.category,
        });
        if (persisted) {
          // Swap to the durable public URL going forward
          setTryOnUrl(persisted.imageUrl);
          onTryOnReady?.(persisted.imageUrl);
        }
      }
    } catch (err: any) {
      console.error('Inline try-on failed', err);
      const msg = err?.message || 'Try-on image failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsTryingOn(false);
    }
  };

  useEffect(() => {
    if (open && item && brand && hasAvatar && avatarUrl && !tryOnUrl && !isTryingOn) {
      runTryOn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, brand?.id, hasAvatar, avatarUrl]);

  if (!item || !brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Try on {item.name}
          </DialogTitle>
        </DialogHeader>

        {!hasAvatar ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your avatar first to try on items.
            </p>
            <Button onClick={() => { onOpenChange(false); navigate('/'); }}>
              Create Avatar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative flex items-center justify-center">
              {isTryingOn && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-foreground">Fitting it on you…</p>
                </div>
              )}
              {tryOnUrl ? (
                <img src={tryOnUrl} alt={`You wearing ${item.name}`} className="w-full h-full object-cover" />
              ) : error ? (
                <div className="text-center px-6 space-y-3">
                  <ImageOff className="w-10 h-10 text-destructive mx-auto" />
                  <p className="text-xs text-destructive font-medium">{error}</p>
                  <Button size="sm" variant="outline" onClick={runTryOn}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
                  </Button>
                </div>
              ) : (
                avatarUrl && (
                  <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover opacity-60" />
                )
              )}
            </div>

            {tryOnUrl && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() =>
                    downloadWatermarkedImage(
                      tryOnUrl,
                      `mirrorme-${item.name.replace(/\s+/g, '-').toLowerCase()}.jpg`
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </Button>
                <ShareLookButton
                  imageUrl={tryOnUrl}
                  itemName={item.name}
                  variant="outline"
                  size="default"
                  label="Share"
                />
              </div>
            )}

            <Button
              variant="default"
              size="lg"
              className="w-full"
              disabled={isTryingOn || !tryOnUrl}
              title={!tryOnUrl ? 'You must try on this item before ordering' : undefined}
              onClick={() => {
                if (!tryOnUrl) {
                  toast.error('You must try on this item before ordering');
                  return;
                }
                logBrandEvent({
                  eventType: isExternal ? 'external_buy_clicked' : 'order_clicked',
                  brandId: brand.id,
                  itemId: item.id,
                  metadata: { source: 'inline_try_on', has_try_on: true },
                });
                onWhatsApp();
              }}
            >
              {isExternal ? (
                <><ExternalLink className="w-4 h-4 mr-2" /> Buy on Website</>
              ) : (
                <><ShoppingBag className="w-4 h-4 mr-2" /> I want this</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InlineTryOnDialog;
