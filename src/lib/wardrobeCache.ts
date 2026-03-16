const CACHE_KEY = 'wardrobe_items_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any[];
  timestamp: number;
}

export function getCachedWardrobe(): any[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedWardrobe(data: any[]) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearWardrobeCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}
