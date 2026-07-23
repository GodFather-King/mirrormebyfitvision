import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, X, Package, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  brandId: string;
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

interface CatalogItem {
  id: string;
  product_name: string | null;
  product_image: string;
  category: string;
}

type Tab = 'upload' | 'catalog';

const GarmentUploader = ({ userId, brandId, values, onChange, max = 4 }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('upload');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (tab !== 'catalog' || !brandId) return;
    let cancelled = false;
    (async () => {
      setLoadingItems(true);
      const { data, error } = await (supabase.from('brand_items') as any)
        .select('id, product_name, product_image, category')
        .eq('linked_brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!cancelled) {
        if (error) toast.error('Could not load brand items');
        setItems((data as CatalogItem[]) || []);
        setLoadingItems(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, brandId]);

  const addUrl = (url: string) => {
    if (values.includes(url)) return;
    if (values.length >= max) {
      toast.error(`You can combine up to ${max} garments`);
      return;
    }
    onChange([...values, url]);
  };

  const removeAt = (i: number) => {
    onChange(values.filter((_, idx) => idx !== i));
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (values.length >= max) {
      toast.error(`You can combine up to ${max} garments`);
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/garments/${brandId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('ai-studio').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('ai-studio').getPublicUrl(path);
      addUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const canAddMore = values.length < max;

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Outfit ({values.length}/{max}) · e.g. top + bottom + shoes
          </p>
          <div className="flex flex-wrap gap-2">
            {values.map((url, i) => (
              <Card key={url} className="relative w-24 h-32 overflow-hidden">
                <img src={url} alt={`Garment ${i + 1}`} className="w-full h-full object-cover bg-muted/40" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 w-6 h-6"
                  onClick={() => removeAt(i)}
                >
                  <X className="w-3 h-3" />
                </Button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                  {i === 0 ? 'Base' : `Layer ${i}`}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!canAddMore ? (
        <p className="text-xs text-muted-foreground">Maximum {max} garments reached. Remove one to add another.</p>
      ) : (
        <>
          <div className="inline-flex rounded-md border p-0.5 bg-muted/30">
            <Button type="button" size="sm" variant={tab === 'upload' ? 'default' : 'ghost'} className="h-8 text-xs" onClick={() => setTab('upload')}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload new
            </Button>
            <Button type="button" size="sm" variant={tab === 'catalog' ? 'default' : 'ghost'} className="h-8 text-xs" onClick={() => setTab('catalog')}>
              <Package className="w-3.5 h-3.5 mr-1.5" /> From catalog
            </Button>
          </div>

          {tab === 'upload' && (
            <Card
              className="aspect-[3/4] max-w-xs flex flex-col items-center justify-center gap-3 p-6 border-dashed cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              />
              {busy ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    {values.length === 0 ? <Upload className="w-6 h-6 text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {values.length === 0 ? 'Upload clothing photo' : 'Add another garment'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {values.length === 0 ? 'Start with a top, dress, or hero piece' : 'e.g. bottoms, shoes, jacket'}
                    </p>
                  </div>
                </>
              )}
            </Card>
          )}

          {tab === 'catalog' && (
            <Card className="p-3">
              {loadingItems ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No items in this brand yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add products to the brand or upload a new photo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto">
                  {items.map((it) => {
                    const selected = values.includes(it.product_image);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => selected ? onChange(values.filter((v) => v !== it.product_image)) : addUrl(it.product_image)}
                        className={`group relative aspect-square rounded-md overflow-hidden bg-muted border transition-colors ${
                          selected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'
                        }`}
                      >
                        <img src={it.product_image} alt={it.product_name || 'Item'} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] p-1 truncate">
                          {it.product_name || it.category}
                        </div>
                        {selected && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GarmentUploader;
