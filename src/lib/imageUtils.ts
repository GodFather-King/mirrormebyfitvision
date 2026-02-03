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
  
  // Already a data URL (base64)
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
