import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { addWatermarkToImage } from '@/lib/watermarkImage';

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
 * Share a try-on look. ENFORCES image attachment via Web Share API.
 * If the platform cannot share files, we refuse to share a bare URL
 * (per the "no image = no action" rule) and instruct the user.
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
  const disabled = busy || !imageUrl;

  const handleShare = async () => {
    if (!imageUrl) {
      toast.error('Image required for sharing');
      return;
    }
    setBusy(true);
    try {
      // 1. Watermark first (strict — block if it fails)
      const watermarked = await addWatermarkToImage(imageUrl);
      if (!watermarked) {
        toast.error("Couldn't prepare image. Please try again.");
        return;
      }

      const file = new File([watermarked], 'mirrorme-look.jpg', { type: 'image/jpeg' });

      // 2. Try Web Share API with file attached
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] }) && navAny.share) {
        try {
          await navAny.share({ files: [file], title: 'MirrorMe Look', text });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // user cancelled
          throw err;
        }
      }

      // 3. No file-share support → save to device + copy caption so the
      //    user can attach it manually (still guarantees an image is shared).
      const url = URL.createObjectURL(watermarked);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mirrorme-look.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
      toast.success('Image saved — open WhatsApp and attach it');
    } catch (err: any) {
      console.error('Share failed', err);
      toast.error('Image required for sharing');
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
      disabled={disabled}
      className={cn('gap-1.5', className)}
      title={!imageUrl ? 'Try on an item first' : 'Share your look'}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
};

export default ShareLookButton;
