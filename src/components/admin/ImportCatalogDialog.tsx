import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Globe, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type DedupeBy = 'any' | 'image' | 'product_url' | 'name';

interface ExtractedProduct {
  name: string;
  image_url: string;
  product_url: string;
  price: number | null;
  currency: string | null;
  category: string;
}

interface ImportCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  defaultUrl?: string | null;
  onImported?: () => void;
}

const ImportCatalogDialog = ({
  open,
  onOpenChange,
  brandId,
  brandName,
  defaultUrl,
  onImported,
}: ImportCatalogDialogProps) => {
  const [url, setUrl] = useState(defaultUrl || '');
  const [maxPages, setMaxPages] = useState<number>(3);
  const [dedupeBy, setDedupeBy] = useState<DedupeBy>('any');
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [pagesScanned, setPagesScanned] = useState<number>(0);
  const [dedupeStats, setDedupeStats] = useState<{ batch: number; existing: number } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchProducts = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error('Enter a valid http(s) URL');
      return;
    }
    setLoading(true);
    setProducts([]);
    setSelected(new Set());
    setPagesScanned(0);
    setDedupeStats(null);
    try {
      const { data, error } = await supabase.functions.invoke('import-brand-catalog', {
        body: {
          mode: 'preview',
          url: url.trim(),
          max_pages: maxPages,
          dedupe_by: dedupeBy,
          skip_existing: skipExisting,
          brand_id: brandId,
        },
      });
      if (error) throw error;
      const found: ExtractedProduct[] = data?.products || [];
      const scanned: number = data?.pages_scanned || 1;
      const dd = data?.dedupe;
      setPagesScanned(scanned);
      if (dd) setDedupeStats({ batch: dd.duplicates_in_batch || 0, existing: dd.duplicates_already_in_catalog || 0 });
      if (found.length === 0) {
        toast.error('No products detected. Try a product listing/category page URL instead of the homepage.');
      } else {
        setProducts(found);
        // Pre-select all
        setSelected(new Set(found.map((_, i) => i)));
        const dropped = (dd?.duplicates_in_batch || 0) + (dd?.duplicates_already_in_catalog || 0);
        toast.success(
          `Found ${found.length} product${found.length === 1 ? '' : 's'} across ${scanned} page${scanned === 1 ? '' : 's'}` +
            (dropped > 0 ? ` · ${dropped} duplicate${dropped === 1 ? '' : 's'} skipped` : ''),
        );
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to scan website');
    } finally {
      setLoading(false);
    }
  };


  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((_, i) => i)));
  };

  const commit = async () => {
    const chosen = products.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-brand-catalog', {
        body: { mode: 'commit', brand_id: brandId, products: chosen },
      });
      if (error) throw error;
      toast.success(`Imported ${data?.inserted ?? chosen.length} items into ${brandName}`);
      onImported?.();
      onOpenChange(false);
      setProducts([]);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Import catalog from website
          </DialogTitle>
          <DialogDescription>
            Paste {brandName}'s shop URL — MirrorMe AI will detect products and let you bulk-add them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs">Brand shop / category page URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbrand.com/shop"
                className="pl-8"
                disabled={loading || importing}
              />
            </div>
            <Button onClick={fetchProducts} disabled={loading || importing}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Pages to scan</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                className="h-7 w-16 text-xs"
                disabled={loading || importing}
              />
              <span className="text-[10px] text-muted-foreground">(max 10)</span>
            </div>
            {pagesScanned > 0 && (
              <span className="text-[10px] text-muted-foreground">Scanned {pagesScanned} page{pagesScanned === 1 ? '' : 's'}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Dedupe by</Label>
              <Select value={dedupeBy} onValueChange={(v) => setDedupeBy(v as DedupeBy)} disabled={loading || importing}>
                <SelectTrigger className="h-7 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (image / URL / name)</SelectItem>
                  <SelectItem value="image">Image only</SelectItem>
                  <SelectItem value="product_url">Product URL only</SelectItem>
                  <SelectItem value="name">Normalized name only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={skipExisting}
                onCheckedChange={(v) => setSkipExisting(v === true)}
                disabled={loading || importing}
              />
              Skip items already in this brand
            </label>
            {dedupeStats && (dedupeStats.batch + dedupeStats.existing > 0) && (
              <span className="text-[10px] text-muted-foreground">
                Skipped {dedupeStats.batch} in-batch · {dedupeStats.existing} already saved
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tip: use a product listing / "shop all" URL. We auto-follow "Next" links and <code>?page=N</code> patterns.
          </p>
        </div>

        {products.length > 0 && (
          <>
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {selected.size} of {products.length} selected
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === products.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggle(i)}
                      className={`relative rounded-lg border-2 cursor-pointer overflow-hidden transition ${
                        isSelected ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <Checkbox checked={isSelected} className="bg-background" />
                      </div>
                      <div className="aspect-square bg-muted">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/></svg>';
                          }}
                        />
                      </div>
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                        <div className="flex items-center justify-between gap-1">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {p.category}
                          </Badge>
                          {p.price != null && (
                            <span className="text-[10px] font-semibold text-primary">
                              {p.currency || 'ZAR'} {p.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={commit} disabled={importing || selected.size === 0}>
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Import {selected.size} item{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCatalogDialog;
