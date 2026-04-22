import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ShoppingBag, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAvatar } from '@/hooks/useAvatar';
import { useTryOnWithRetry } from '@/hooks/useTryOnWithRetry';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { logBrandEvent } from '@/lib/brandEvents';
import { useNavigate } from 'react-router-dom';
import ShareLookButton from '@/components/ShareLookButton';

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
}

const InlineTryOnDialog = ({
  open,
  onOpenChange,
  item,
  brand,
  onWhatsApp,
  onTryOnReady,
}: InlineTryOnDialogProps) => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const run = async () => {
      if (!open || !item || !brand) return;
      if (!hasAvatar || !avatarUrl) return;

      setIsTryingOn(true);
      setError(null);
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

        setTryOnUrl(result.tryOnUrl);
        if (result.tryOnUrl) onTryOnReady?.(result.tryOnUrl);
      } catch (err: any) {
        console.error('Inline try-on failed', err);
        setError(err?.message || 'Try-on failed. Please try again.');
        toast.error(err?.message || 'Try-on failed.');
      } finally {
        setIsTryingOn(false);
      }
    };
    run();
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
                <div className="text-center px-6">
                  <ImageOff className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              ) : (
                avatarUrl && (
                  <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover opacity-60" />
                )
              )}
            </div>

            {tryOnUrl && (
              <ShareLookButton
                imageUrl={tryOnUrl}
                itemName={item.name}
                variant="outline"
                size="default"
                className="w-full"
              />
            )}

            <Button
              variant="default"
              size="lg"
              className="w-full"
              disabled={isTryingOn}
              onClick={() => {
                logBrandEvent({
                  eventType: 'order_clicked',
                  brandId: brand.id,
                  itemId: item.id,
                  metadata: { source: 'inline_try_on', has_try_on: !!tryOnUrl },
                });
                onWhatsApp();
              }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              I want this
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InlineTryOnDialog;
