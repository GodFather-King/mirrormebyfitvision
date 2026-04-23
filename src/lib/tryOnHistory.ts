import { supabase } from '@/integrations/supabase/client';

/** Convert a data URL or remote URL into a Blob for storage upload. */
const toBlob = async (url: string): Promise<Blob> => {
  if (url.startsWith('data:')) {
    const res = await fetch(url);
    return res.blob();
  }
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return res.blob();
};

export interface PersistTryOnInput {
  userId: string;
  imageUrl: string;
  source?: string;
  brandId?: string | null;
  brandItemId?: string | null;
  itemName?: string | null;
  category?: string | null;
}

export interface PersistedTryOn {
  id: string;
  imageUrl: string;
  storagePath: string;
}

/**
 * Upload the try-on image to storage and record it in try_on_history.
 * Best-effort: failures are swallowed (the in-memory image still works for
 * the current session) but logged.
 */
export const persistTryOnImage = async (
  input: PersistTryOnInput
): Promise<PersistedTryOn | null> => {
  try {
    const blob = await toBlob(input.imageUrl);
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const path = `${input.userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('try-ons')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from('try-ons').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { data: inserted, error: insErr } = await (supabase
      .from('try_on_history') as any)
      .insert({
        user_id: input.userId,
        image_url: publicUrl,
        storage_path: path,
        source: input.source || 'brand_store',
        brand_id: input.brandId || null,
        brand_item_id: input.brandItemId || null,
        item_name: input.itemName || null,
        category: input.category || null,
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    return { id: (inserted as any).id, imageUrl: publicUrl, storagePath: path };
  } catch (err) {
    console.error('persistTryOnImage failed', err);
    return null;
  }
};

export interface TryOnHistoryRow {
  id: string;
  image_url: string;
  storage_path: string | null;
  source: string;
  brand_id: string | null;
  brand_item_id: string | null;
  item_name: string | null;
  category: string | null;
  created_at: string;
}

export const fetchTryOnHistory = async (limit = 60): Promise<TryOnHistoryRow[]> => {
  const { data, error } = await (supabase.from('try_on_history') as any)
    .select('id, image_url, storage_path, source, brand_id, brand_item_id, item_name, category, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('fetchTryOnHistory failed', error);
    return [];
  }
  return (data as TryOnHistoryRow[]) || [];
};

export const deleteTryOnHistoryEntry = async (
  id: string,
  storagePath: string | null
): Promise<boolean> => {
  try {
    if (storagePath) {
      await supabase.storage.from('try-ons').remove([storagePath]);
    }
    const { error } = await (supabase.from('try_on_history') as any).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteTryOnHistoryEntry failed', err);
    return false;
  }
};
