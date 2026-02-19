/**
 * Normalizes image orientation by drawing to canvas.
 * This strips EXIF rotation data so the image always appears upright.
 * Returns a data URL of the corrected image.
 */
export function normalizeImageOrientation(dataUrl: string, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Scale down if too large
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image for orientation fix'));
    img.src = dataUrl;
  });
}

/**
 * Converts a relative image URL to an absolute URL
 * The AI gateway requires full URLs, not relative paths
 */
export function getAbsoluteImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) return undefined;
  
  // Already an absolute URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Already a data URL (base64) - return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Relative URL - convert to absolute using current origin
  // This handles paths like /products/jacket.jpg
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  
  return imageUrl;
}

/**
 * Converts an image URL to base64 for edge function processing
 * Use this when the edge function can't access the image URL directly
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Prepares an image URL for use in edge functions.
 * Converts relative paths to base64 since edge functions can't access preview server.
 * Returns absolute URLs and data URLs as-is.
 */
export async function prepareImageForEdgeFunction(imageUrl: string | undefined | null): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  
  // Already a data URL (base64) - compress it
  if (imageUrl.startsWith('data:')) {
    return await compressImageDataUrl(imageUrl);
  }
  
  // Absolute URL to external server - return as-is (no need to convert)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Relative URL - edge functions can't access preview server, convert to base64
  try {
    const absoluteUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
      : imageUrl;
    const base64 = await imageUrlToBase64(absoluteUrl);
    return await compressImageDataUrl(base64);
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return undefined;
  }
}

/**
 * Compresses a base64 data URL by resizing to max 768px and using JPEG quality 0.7.
 * This significantly reduces payload size for faster AI processing.
 */
function compressImageDataUrl(dataUrl: string, maxSize = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        // Already small enough, just re-encode at lower quality
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
        return;
      }
      const scale = maxSize / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}
