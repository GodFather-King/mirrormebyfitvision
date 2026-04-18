import logoUrl from '@/assets/mirrorme-logo-mark.png';

let cachedLogo: HTMLImageElement | null = null;
const loadLogo = (): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (cachedLogo) return resolve(cachedLogo);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedLogo = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });

/**
 * Adds a "MirrorMe by FitVision (PTY) Ltd" watermark with logo to an image URL.
 * Returns a Blob (JPEG) of the watermarked image, or null if it fails.
 */
export const addWatermarkToImage = async (
  imageUrl: string,
  text = 'MirrorMe by FitVision (PTY) Ltd'
): Promise<Blob | null> => {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    const blob = await res.blob();
    const [bitmap, logo] = await Promise.all([createImageBitmap(blob), loadLogo()]);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0);

    // Watermark sizing scales with image width
    const fontSize = Math.max(18, Math.round(canvas.width * 0.028));
    const padding = Math.round(fontSize * 0.6);
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    const barHeight = fontSize + padding * 1.6;
    const centerY = canvas.height - barHeight / 2;

    // Semi-transparent gradient strip at the bottom for legibility
    const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    // Subtle shadow for the text
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(text, canvas.width - padding, centerY);
    ctx.shadowBlur = 0;

    // Draw logo to the left of the text
    if (logo) {
      const textWidth = ctx.measureText(text).width;
      const logoSize = Math.round(fontSize * 1.5);
      const gap = Math.round(fontSize * 0.4);
      const logoX = canvas.width - padding - textWidth - gap - logoSize;
      const logoY = centerY - logoSize / 2;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      ctx.shadowBlur = 0;
    }

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });
  } catch (err) {
    console.error('Failed to watermark image', err);
    return null;
  }
};
