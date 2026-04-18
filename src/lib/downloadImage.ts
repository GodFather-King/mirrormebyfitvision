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
 * Fetches the image at imageUrl, applies the MirrorMe watermark, and
 * triggers a download with the given filename. Shows toast feedback.
 */
export const downloadWatermarkedImage = async (imageUrl: string, filename: string) => {
  const t = toast.loading('Preparing download…');
  try {
    const watermarked = await addWatermarkToImage(imageUrl);
    if (!watermarked) {
      // Fallback: download the original
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
    } else {
      triggerBlobDownload(watermarked, filename);
    }
    toast.success('Downloaded', { id: t });
  } catch (err) {
    console.error('Download failed', err);
    toast.error("Couldn't download image", { id: t });
  }
};
