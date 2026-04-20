/**
 * Composite an uploaded product/clothing image onto a clean,
 * subtle studio-style background so items look presentable in the store.
 *
 * - Square 1024x1024 canvas
 * - Soft neutral radial gradient (works in light and dark UI)
 * - Image is contained with padding and a faint drop shadow
 * - Returns a JPEG Blob
 */
export async function composeOnCleanBackground(
  file: File | Blob,
  size = 1024,
  padding = 64,
  quality = 0.9
): Promise<Blob> {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Subtle studio gradient — bright center, slightly cooler edges.
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size * 0.75
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#eef1f5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Fit image inside the padded area while preserving aspect ratio.
  const maxW = size - padding * 2;
  const maxH = size - padding * 2;
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (size - w) / 2;
  const y = (size - h) / 2;

  // Faint drop shadow to lift the product off the background.
  ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(img, x, y, w, h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      'image/jpeg',
      quality
    );
  });
}

function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
