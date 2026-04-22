import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ShareLookButtonProps {
  imageUrl: string | null | undefined;
  caption?: string;
  itemName?: string | null;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'glass';
  label?: string;
}

const DEFAULT_CAPTION = 'What do you think about this outfit?';

/**
 * Share a try-on look via the Web Share API.
 * On modern mobile browsers this opens the native share sheet (WhatsApp,
 * Status, Contacts, etc.) with the actual try-on image attached. Falls back
 * to copying the image URL when sharing files isn't supported.
 */
const ShareLookButton = ({
  imageUrl,
  caption = DEFAULT_CAPTION,
  itemName,
  className,
  size = 'sm',
  variant = 'outline',
  label = 'Share Look',
}: ShareLookButtonProps) => {
  const [busy, setBusy] = useState(false);

  const text = itemName ? `${caption}\n${itemName}` : caption;

  const handleShare = async () => {
    if (!imageUrl) {
      toast.error('No image to share yet');
      return;
    }
    setBusy(true);
    try {
      // Try sharing as a file (best on mobile — opens WhatsApp / Status with the image)
      try {
        const res = await fetch(imageUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'mirrorme-look.jpg', { type: blob.type || 'image/jpeg' });
          const navAny = navigator as any;
          if (navAny.canShare && navAny.canShare({ files: [file] })) {
            await navAny.share({
              files: [file],
              title: 'MirrorMe Look',
              text,
            });
            return;
          }
        }
      } catch {
        /* fall through to URL share */
      }

      // Fallback: share the URL only
      if (navigator.share) {
        await navigator.share({
          title: 'MirrorMe Look',
          text,
          url: imageUrl,
        });
        return;
      }

      // Final fallback: copy
      await navigator.clipboard.writeText(`${text}\n${imageUrl}`);
      toast.success('Look copied to clipboard');
    } catch (err: any) {
      // User cancelling the native share throws AbortError — ignore silently
      if (err?.name !== 'AbortError') {
        console.error('Share failed', err);
        toast.error('Could not share');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleShare}
      disabled={busy || !imageUrl}
      className={cn('gap-1.5', className)}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
};

export default ShareLookButton;
