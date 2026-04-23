import { addWatermarkToImage } from '@/lib/watermarkImage';
import { toast } from 'sonner';

/** Trigger a browser download for a Blob with a chosen filename. */
const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Watermark + download with one automatic retry. Strict: if watermarking
 * fails twice we refuse to export (the global "no watermark = no export"
 * rule). Returns true on success.
 */
export const downloadWatermarkedImage = async (
  imageUrl: string | null | undefined,
  filename: string
): Promise<boolean> => {
  if (!imageUrl) {
    toast.error('No try-on image available to download');
    return false;
  }

  const t = toast.loading('Preparing download…');
  const attempt = async () => {
    const watermarked = await addWatermarkToImage(imageUrl);
    if (!watermarked) throw new Error('watermark_failed');
    triggerBlobDownload(watermarked, filename);
  };

  try {
    await attempt();
    toast.success('Downloaded', { id: t });
    return true;
  } catch (err) {
    console.warn('Download failed, retrying…', err);
    toast.loading('Download failed, retrying…', { id: t });
    try {
      await attempt();
      toast.success('Downloaded', { id: t });
      return true;
    } catch (err2) {
      console.error('Download failed after retry', err2);
      toast.error("Couldn't download image. Try again in a moment.", { id: t });
      return false;
    }
  }
};
