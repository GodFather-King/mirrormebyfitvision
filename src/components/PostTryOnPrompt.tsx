import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Sparkles, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PostTryOnPromptProps {
  open: boolean;
  onClose: () => void;
  onSaveOutfit: () => void;
  onTryAnother: () => void;
  itemName?: string;
  shareImageUrl?: string | null;
}

const buildShareText = (itemName?: string) => {
  const look = itemName ? `"${itemName}"` : 'this look';
  return `Check out ${look} on me 👀 — virtually tried on with MirrorMe ✨ https://fitvision.co.za`;
};

const PostTryOnPrompt = React.forwardRef<React.ElementRef<typeof SheetContent>, PostTryOnPromptProps>(
  ({ open, onClose, onSaveOutfit, onTryAnother, itemName, shareImageUrl }, ref) => {
    const [sharing, setSharing] = React.useState(false);

    const handleWhatsAppShare = async () => {
      const text = buildShareText(itemName);
      setSharing(true);
      try {
        // Prefer native share with image (mobile WhatsApp will be in the share sheet)
        if (shareImageUrl && typeof navigator !== 'undefined' && 'share' in navigator) {
          try {
            const res = await fetch(shareImageUrl, { mode: 'cors' });
            const blob = await res.blob();
            const file = new File([blob], 'mirrorme-tryon.jpg', { type: blob.type || 'image/jpeg' });
            const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
            if (nav.canShare && nav.canShare({ files: [file] })) {
              await nav.share({ files: [file], text, title: 'My MirrorMe try-on' });
              return;
            }
            // Native share without file support
            await navigator.share({ text, title: 'My MirrorMe try-on' });
            return;
          } catch (err) {
            // User canceled or fetch blocked — fall through to wa.me
            const aborted = err instanceof Error && err.name === 'AbortError';
            if (aborted) return;
          }
        }

        // Fallback: open WhatsApp with text (and image URL if we have one)
        const message = shareImageUrl ? `${text}\n${shareImageUrl}` : text;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error("Couldn't open WhatsApp. Please try again.");
      } finally {
        setSharing(false);
      }
    };

    return (
      <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
        <SheetContent ref={ref} side="bottom" className="rounded-t-2xl pb-8 pt-6 px-6 max-h-[55vh]">
          <SheetHeader className="items-center text-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <SheetTitle className="text-lg font-display">🔥 This look fits you well!</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {itemName ? `"${itemName}" looks great on you.` : 'Love this look?'} Save it, share it, or keep styling.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleWhatsAppShare}
              disabled={sharing}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              size="lg"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {sharing ? 'Opening WhatsApp…' : 'Share to WhatsApp'}
            </Button>
            <Button
              onClick={onSaveOutfit}
              className="w-full bg-gradient-to-r from-primary to-secondary"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Outfit
            </Button>
            <Button
              variant="outline"
              onClick={onTryAnother}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

PostTryOnPrompt.displayName = 'PostTryOnPrompt';

export default PostTryOnPrompt;
