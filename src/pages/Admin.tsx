import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Pencil, ShieldCheck, ArrowLeft, Upload, PackagePlus, Wand2, Inbox, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { compressImageFile } from '@/lib/compressImage';
import { composeOnCleanBackground } from '@/lib/cleanBackground';
import BrandOwnersPanel from '@/components/admin/BrandOwnersPanel';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_approved: boolean;
  is_featured: boolean;
  is_verified: boolean;
  order_method: 'whatsapp' | 'inbox' | 'external';
  external_website_url: string | null;
}

interface BrandItem {
  id: string;
  brand_name: string;
  product_name: string | null;
  product_image: string;
  category: string;
  price: number | null;
  currency: string | null;
  is_marketplace: boolean;
  linked_brand_id: string | null;
  click_count: number;
  product_url: string | null;
  external_url: string | null;
}

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [items, setItems] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Brand form
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '', description: '', whatsapp_number: '', logo_url: '',
    cover_image_url: '', location: '', is_approved: true, is_featured: false, is_verified: false,
    order_method: 'whatsapp' as 'whatsapp' | 'inbox' | 'external',
    external_website_url: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Item form
  const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
  const [itemForm, setItemForm] = useState({
    product_name: '', category: 'tops', price: '',
    linked_brand_id: '', product_image: '', product_url: '', external_url: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(false);
  const [activeTab, setActiveTab] = useState<'brands' | 'items' | 'owners'>('brands');
  const [itemBrandFilter, setItemBrandFilter] = useState<string>('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && user && !isAdmin) {
      toast.error('Admin access only');
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: b }, { data: i }] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('brand_items').select('*').order('created_at', { ascending: false }),
    ]);
    setBrands((b as Brand[]) || []);
    setItems((i as BrandItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  // ---------- Brand handlers ----------
  const resetBrandForm = () => {
    setEditingBrand(null);
    setBrandForm({
      name: '', description: '', whatsapp_number: '', logo_url: '',
      cover_image_url: '', location: '', is_approved: true, is_featured: false, is_verified: false,
      order_method: 'whatsapp',
      external_website_url: '',
    });
  };

  const startEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({
      name: b.name,
      description: b.description ?? '',
      whatsapp_number: b.whatsapp_number ?? '',
      logo_url: b.logo_url ?? '',
      cover_image_url: b.cover_image_url ?? '',
      location: b.location ?? '',
      is_approved: b.is_approved,
      is_featured: b.is_featured,
      is_verified: b.is_verified,
      order_method: b.order_method ?? 'whatsapp',
      external_website_url: b.external_website_url ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadAsset = async (file: File, prefix: string): Promise<string | null> => {
    try {
      let blob: Blob;
      try {
        blob = await compressImageFile(file, 1024, 0.85);
      } catch {
        blob = file;
      }
      const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage
        .from('brand-assets')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed');
      return null;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadAsset(file, 'logos');
    setUploadingLogo(false);
    if (url) setBrandForm((f) => ({ ...f, logo_url: url }));
    e.target.value = '';
  };

  const saveBrand = async () => {
    if (!brandForm.name.trim()) {
      toast.error('Brand name is required');
      return;
    }
    if (brandForm.order_method === 'whatsapp' && !brandForm.whatsapp_number.trim()) {
      toast.error('WhatsApp number is required for WhatsApp order method');
      return;
    }
    if (brandForm.order_method === 'external' && !brandForm.external_website_url.trim()) {
      toast.error('External website URL is required for External Website Store mode');
      return;
    }
    setSavingBrand(true);
    const payload = {
      name: brandForm.name.trim(),
      slug: editingBrand ? editingBrand.slug : slugify(brandForm.name),
      description: brandForm.description || null,
      whatsapp_number: brandForm.whatsapp_number.trim() || null,
      logo_url: brandForm.logo_url || null,
      cover_image_url: brandForm.cover_image_url || null,
      location: brandForm.location || null,
      is_approved: brandForm.is_approved,
      is_featured: brandForm.is_featured,
      is_verified: brandForm.is_verified,
      order_method: brandForm.order_method,
      external_website_url: brandForm.external_website_url.trim() || null,
    };
    const { error } = editingBrand
      ? await supabase.from('brands').update(payload as any).eq('id', editingBrand.id)
      : await supabase.from('brands').insert(payload as any);
    setSavingBrand(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingBrand ? 'Brand updated' : 'Brand added');
    resetBrandForm();
    loadData();
  };

  const copyStoreLink = async (slug: string) => {
    const url = `${window.location.origin}/store/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Store link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand? Items linked to it remain but become unlinked.')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Brand deleted');
    loadData();
  };

  // ---------- Item handlers ----------
  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      product_name: '', category: 'tops', price: '',
      linked_brand_id: '', product_image: '', product_url: '', external_url: '',
    });
  };

  const startAddItemForBrand = (brandId: string) => {
    resetItemForm();
    setItemForm((f) => ({ ...f, linked_brand_id: brandId }));
    setActiveTab('items');
    setItemBrandFilter(brandId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditItem = (it: BrandItem) => {
    setEditingItem(it);
    setItemForm({
      product_name: it.product_name ?? '',
      category: it.category,
      price: it.price?.toString() ?? '',
      linked_brand_id: it.linked_brand_id ?? '',
      product_image: it.product_image,
      product_url: it.product_url ?? '',
      external_url: it.external_url ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Run an uploaded image through the AI product-shot pipeline.
  // 1) Upload the raw photo to storage so the AI can fetch it.
  // 2) Ask the `process-clothing` edge function for an e-commerce cutout.
  // 3) Fall back to the local clean-background compositor if the AI fails.
  const aiCleanProductImage = async (
    file: File | Blob,
    category?: string,
  ): Promise<string | null> => {
    try {
      const rawFile =
        file instanceof File ? file : new File([file], 'product.jpg', { type: 'image/jpeg' });
      const rawUrl = await uploadAsset(rawFile, 'items/raw');
      if (!rawUrl) throw new Error('Raw upload failed');

      const { data, error } = await supabase.functions.invoke('process-clothing', {
        body: { imageUrl: rawUrl, category: category || itemForm.category, name: itemForm.product_name || 'product' },
      });
      if (error) throw error;
      const processed = (data as any)?.processedImageUrl as string | undefined;
      if (processed && processed.startsWith('http') && processed !== rawUrl) return processed;
      return null;
    } catch (err) {
      console.warn('AI clean product image failed, falling back to gradient composite', err);
      return null;
    }
  };

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItem(true);
    try {
      // 1) Try AI-powered e-commerce product shot (clean cutout + studio background)
      const aiUrl = await aiCleanProductImage(file, itemForm.category);
      if (aiUrl) {
        setItemForm((f) => ({ ...f, product_image: aiUrl }));
        toast.success('Clean product image ready');
        return;
      }

      // 2) Fallback: gradient compositor on the original upload
      const composed = await composeOnCleanBackground(file).catch(() => file);
      const composedFile =
        composed instanceof File
          ? composed
          : new File([composed], 'product.jpg', { type: 'image/jpeg' });
      const url = await uploadAsset(composedFile, 'items');
      if (url) {
        setItemForm((f) => ({ ...f, product_image: url }));
        toast.message('Used gradient background (AI clean-up unavailable)');
      }
    } finally {
      setUploadingItem(false);
      e.target.value = '';
    }
  };

  const regenerateItemBackground = async (item: BrandItem) => {
    if (!item.product_image) {
      toast.error('No image to regenerate');
      return;
    }
    setRegeneratingId(item.id);
    try {
      // 1) Try AI clean product shot directly from the existing public URL
      let newUrl: string | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('process-clothing', {
          body: { imageUrl: item.product_image, category: item.category, name: item.product_name || 'product' },
        });
        if (!error) {
          const processed = (data as any)?.processedImageUrl as string | undefined;
          if (processed && processed.startsWith('http') && processed !== item.product_image) {
            newUrl = processed;
          }
        }
      } catch (aiErr) {
        console.warn('AI regenerate failed, falling back to gradient', aiErr);
      }

      // 2) Fallback: download and re-composite on gradient background
      if (!newUrl) {
        const res = await fetch(item.product_image, { mode: 'cors' });
        if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
        const blob = await res.blob();
        const composed = await composeOnCleanBackground(blob);
        const composedFile = new File([composed], 'product.jpg', { type: 'image/jpeg' });
        newUrl = await uploadAsset(composedFile, 'items');
      }
      if (!newUrl) throw new Error('Upload failed');

      const { error: updateErr } = await (supabase.from('brand_items') as any)
        .update({ product_image: newUrl })
        .eq('id', item.id);
      if (updateErr) throw updateErr;

      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, product_image: newUrl! } : it)));
      toast.success('Product image refreshed');
    } catch (err: any) {
      console.error('regenerate background failed', err);
      const msg = err?.message || 'Failed to regenerate background';
      if (msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('fetch')) {
        toast.error('Could not download the original image. Try re-uploading instead.');
      } else {
        toast.error(msg);
      }
    } finally {
      setRegeneratingId(null);
    }
  };

  const saveItem = async () => {
    // Granular validation so the user knows exactly what's missing
    if (!user) {
      toast.error('You must be signed in');
      return;
    }
    if (!itemForm.product_name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!itemForm.linked_brand_id) {
      toast.error('Please select a brand');
      return;
    }
    const brand = brands.find((b) => b.id === itemForm.linked_brand_id);
    if (!brand) {
      toast.error('Selected brand not found — refresh and try again');
      return;
    }
    if (!itemForm.product_image || !/^https?:\/\//.test(itemForm.product_image)) {
      toast.error('Please upload (or paste a valid URL for) the product image');
      return;
    }
    if (itemForm.price && isNaN(Number(itemForm.price))) {
      toast.error('Price must be a number');
      return;
    }

    setSavingItem(true);
    const payload = {
      user_id: user.id,
      brand_name: brand.name,
      linked_brand_id: itemForm.linked_brand_id,
      product_name: itemForm.product_name.trim(),
      product_image: itemForm.product_image,
      category: itemForm.category,
      price: itemForm.price ? Number(itemForm.price) : null,
      currency: 'ZAR',
      product_url: itemForm.product_url?.trim() || null,
      external_url: itemForm.external_url?.trim() || null,
      is_marketplace: true,
    };

    try {
      const { error } = editingItem
        ? await supabase.from('brand_items').update(payload).eq('id', editingItem.id)
        : await supabase.from('brand_items').insert(payload);

      if (error) {
        console.error('saveItem error', { error, payload });
        const msg = error.message || error.details || error.hint || 'Unknown database error';
        // Friendly hint for the most common failure
        if (/row-level security|permission denied/i.test(msg)) {
          toast.error('Permission denied — admin role required. Sign out and back in if you were just promoted.');
        } else {
          toast.error(`Save failed: ${msg}`);
        }
        return;
      }
      toast.success(editingItem ? 'Item updated' : 'Item added');
      resetItemForm();
      loadData();
    } catch (e: any) {
      console.error('saveItem unexpected error', e);
      toast.error(`Unexpected error: ${e?.message ?? 'see console'}`);
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('brand_items').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Item deleted');
    loadData();
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const totalClicks = items.reduce((s, i) => s + (i.click_count || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/orders')}>
            <Inbox className="w-4 h-4 mr-2" /> Orders Inbox
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Brands</p>
            <p className="text-2xl font-bold">{brands.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">WhatsApp clicks</p>
            <p className="text-2xl font-bold">{totalClicks}</p>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'brands' | 'items' | 'owners')}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="items">Clothing</TabsTrigger>
            <TabsTrigger value="owners">Owners</TabsTrigger>
          </TabsList>

          {/* BRANDS TAB */}
          <TabsContent value="brands" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">{editingBrand ? 'Edit brand' : 'Add new brand'}</h2>

              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="e.g., Sogama Studio" />
              </div>
              <div className="space-y-2">
                <Label>Order Method *</Label>
                <Select
                  value={brandForm.order_method}
                  onValueChange={(v) => setBrandForm({ ...brandForm, order_method: v as 'whatsapp' | 'inbox' | 'external' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp — orders go to brand's WhatsApp</SelectItem>
                    <SelectItem value="inbox">MirrorMe Inbox — orders appear in your dashboard</SelectItem>
                    <SelectItem value="external">External Website Store — checkout on brand's own site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {brandForm.order_method === 'external' && (
                <div className="space-y-2">
                  <Label>Brand website URL *</Label>
                  <Input
                    value={brandForm.external_website_url}
                    onChange={(e) => setBrandForm({ ...brandForm, external_website_url: e.target.value })}
                    placeholder="https://yourbrand.com"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Customers will be redirected here (or to each item's external URL) to complete purchase.
                  </p>
                </div>
              )}
              {brandForm.order_method !== 'external' && (
                <div className="space-y-2">
                  <Label>
                    WhatsApp number {brandForm.order_method === 'whatsapp' ? '*' : '(optional)'} (with country code, no +)
                  </Label>
                  <Input
                    value={brandForm.whatsapp_number}
                    onChange={(e) => setBrandForm({ ...brandForm, whatsapp_number: e.target.value })}
                    placeholder="e.g., 27821234567"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={brandForm.location} onChange={(e) => setBrandForm({ ...brandForm, location: e.target.value })} placeholder="e.g., Cape Town" />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {brandForm.logo_url && <img src={brandForm.logo_url} alt="Logo" className="w-14 h-14 rounded-lg object-cover" />}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:border-primary text-sm">
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{brandForm.logo_url ? 'Replace' : 'Upload logo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                </div>
                <Input value={brandForm.logo_url} onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })} placeholder="…or paste an image URL" className="text-xs" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center justify-between gap-2 text-sm border rounded-lg p-2">
                  <span>Approved</span>
                  <Switch checked={brandForm.is_approved} onCheckedChange={(v) => setBrandForm({ ...brandForm, is_approved: v })} />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm border rounded-lg p-2">
                  <span>Featured</span>
                  <Switch checked={brandForm.is_featured} onCheckedChange={(v) => setBrandForm({ ...brandForm, is_featured: v })} />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm border rounded-lg p-2">
                  <span>Verified</span>
                  <Switch checked={brandForm.is_verified} onCheckedChange={(v) => setBrandForm({ ...brandForm, is_verified: v })} />
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveBrand} disabled={savingBrand} className="flex-1">
                  {savingBrand ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingBrand ? 'Update brand' : 'Add brand'}
                </Button>
                {editingBrand && <Button variant="outline" onClick={resetBrandForm}>Cancel</Button>}
              </div>
            </Card>

            <div className="space-y-2">
              <h2 className="font-semibold">All brands ({brands.length})</h2>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                brands.map((b) => {
                  const itemCount = items.filter((it) => it.linked_brand_id === b.id).length;
                  return (
                    <Card key={b.id} className="p-3 flex items-center gap-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {b.whatsapp_number || '—'} {b.location ? `· ${b.location}` : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          /store/{b.slug}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">{b.order_method || 'whatsapp'}</span>
                          {b.is_approved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Approved</span>}
                          {b.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">Featured</span>}
                          {b.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">Verified</span>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => copyStoreLink(b.slug)} title="Copy store link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => window.open(`/store/${b.slug}`, '_blank')} title="Open store">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startAddItemForBrand(b.id)} title="Add item to this brand">
                        <PackagePlus className="w-4 h-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEditBrand(b)} title="Edit brand"><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteBrand(b.id)} title="Delete brand"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ITEMS TAB */}
          <TabsContent value="items" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold">{editingItem ? 'Edit item' : 'Add new clothing item'}</h2>

              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={itemForm.linked_brand_id} onValueChange={(v) => setItemForm({ ...itemForm, linked_brand_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {brands.length === 0 && <p className="text-xs text-muted-foreground">Add a brand first.</p>}
              </div>

              <div className="space-y-2">
                <Label>Item name *</Label>
                <Input value={itemForm.product_name} onChange={(e) => setItemForm({ ...itemForm, product_name: e.target.value })} placeholder="e.g., Linen summer dress" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price (ZAR)</Label>
                  <Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} placeholder="optional" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image *</Label>
                {itemForm.product_image ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={itemForm.product_image}
                        alt="Composed product preview"
                        className="w-full aspect-square object-contain"
                      />
                      {uploadingItem && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview of the composed image with clean background. Re-upload if it doesn't look right.
                    </p>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:border-primary text-sm">
                        {uploadingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Replace image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleItemImageUpload} disabled={uploadingItem} />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setItemForm((f) => ({ ...f, product_image: '' }))}
                        disabled={uploadingItem}
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-3 py-6 rounded-lg border border-dashed cursor-pointer hover:border-primary text-sm">
                    {uploadingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploadingItem ? 'Creating clean product shot with AI…' : 'Upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleItemImageUpload} disabled={uploadingItem} />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label>Product URL (optional)</Label>
                <Input value={itemForm.product_url} onChange={(e) => setItemForm({ ...itemForm, product_url: e.target.value })} placeholder="https://…" />
              </div>

              <div className="space-y-2">
                <Label>External purchase URL (for External Website Stores)</Label>
                <Input
                  value={itemForm.external_url}
                  onChange={(e) => setItemForm({ ...itemForm, external_url: e.target.value })}
                  placeholder="https://yourbrand.com/products/this-item"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used when the brand's order method is "External Website Store". Falls back to the brand's website URL if empty.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveItem} disabled={savingItem} className="flex-1">
                  {savingItem ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingItem ? 'Update item' : 'Add item'}
                </Button>
                {editingItem && <Button variant="outline" onClick={resetItemForm}>Cancel</Button>}
              </div>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-semibold">
                  All items ({itemBrandFilter === 'all' ? items.length : items.filter((it) => it.linked_brand_id === itemBrandFilter).length})
                </h2>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Filter:</Label>
                  <Select value={itemBrandFilter} onValueChange={setItemBrandFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All brands</SelectItem>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {items
                    .filter((it) => itemBrandFilter === 'all' || it.linked_brand_id === itemBrandFilter)
                    .map((it) => {
                      const brand = brands.find((b) => b.id === it.linked_brand_id);
                      return (
                        <Card key={it.id} className="p-2">
                          <img src={it.product_image} alt={it.product_name ?? ''} className="w-full aspect-square object-cover rounded-md" />
                          <p className="text-sm font-medium mt-2 truncate">{it.product_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">{brand?.name ?? it.brand_name}</p>
                          {it.price != null && <p className="text-xs">R{it.price}</p>}
                          <div className="flex gap-1 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => regenerateItemBackground(it)}
                              disabled={regeneratingId === it.id}
                              title="Regenerate clean background"
                            >
                              {regeneratingId === it.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wand2 className="w-3 h-3" />
                              )}
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => startEditItem(it)} title="Edit item">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => deleteItem(it.id)} title="Delete item">
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          </TabsContent>
          {/* OWNERS TAB */}
          <TabsContent value="owners" className="space-y-4 mt-4">
            <BrandOwnersPanel brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
