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
import { Loader2, Plus, Trash2, Pencil, ShieldCheck, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { compressImageFile } from '@/lib/compressImage';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  whatsapp_number: string;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  is_approved: boolean;
  is_featured: boolean;
  is_verified: boolean;
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
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Item form
  const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
  const [itemForm, setItemForm] = useState({
    product_name: '', category: 'tops', price: '',
    linked_brand_id: '', product_image: '', product_url: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(false);

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
    });
  };

  const startEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({
      name: b.name,
      description: b.description ?? '',
      whatsapp_number: b.whatsapp_number,
      logo_url: b.logo_url ?? '',
      cover_image_url: b.cover_image_url ?? '',
      location: b.location ?? '',
      is_approved: b.is_approved,
      is_featured: b.is_featured,
      is_verified: b.is_verified,
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
    if (!brandForm.name.trim() || !brandForm.whatsapp_number.trim()) {
      toast.error('Name and WhatsApp number required');
      return;
    }
    setSavingBrand(true);
    const payload = {
      name: brandForm.name.trim(),
      slug: editingBrand ? editingBrand.slug : slugify(brandForm.name),
      description: brandForm.description || null,
      whatsapp_number: brandForm.whatsapp_number.trim(),
      logo_url: brandForm.logo_url || null,
      cover_image_url: brandForm.cover_image_url || null,
      location: brandForm.location || null,
      is_approved: brandForm.is_approved,
      is_featured: brandForm.is_featured,
      is_verified: brandForm.is_verified,
    };
    const { error } = editingBrand
      ? await supabase.from('brands').update(payload).eq('id', editingBrand.id)
      : await supabase.from('brands').insert(payload);
    setSavingBrand(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingBrand ? 'Brand updated' : 'Brand added');
    resetBrandForm();
    loadData();
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
      linked_brand_id: '', product_image: '', product_url: '',
    });
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
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItem(true);
    const url = await uploadAsset(file, 'items');
    setUploadingItem(false);
    if (url) setItemForm((f) => ({ ...f, product_image: url }));
    e.target.value = '';
  };

  const saveItem = async () => {
    if (!itemForm.product_name.trim() || !itemForm.linked_brand_id || !itemForm.product_image) {
      toast.error('Item name, brand, and image are required');
      return;
    }
    if (!user) return;
    const brand = brands.find((b) => b.id === itemForm.linked_brand_id);
    setSavingItem(true);
    const payload = {
      user_id: user.id,
      brand_name: brand?.name ?? 'Unknown',
      linked_brand_id: itemForm.linked_brand_id,
      product_name: itemForm.product_name.trim(),
      product_image: itemForm.product_image,
      category: itemForm.category,
      price: itemForm.price ? Number(itemForm.price) : null,
      currency: 'ZAR',
      product_url: itemForm.product_url || null,
      is_marketplace: true,
    };
    const { error } = editingItem
      ? await supabase.from('brand_items').update(payload).eq('id', editingItem.id)
      : await supabase.from('brand_items').insert(payload);
    setSavingItem(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingItem ? 'Item updated' : 'Item added');
    resetItemForm();
    loadData();
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
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
          </div>
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

        <Tabs defaultValue="brands">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="items">Clothing</TabsTrigger>
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
                <Label>WhatsApp number * (with country code, no +)</Label>
                <Input value={brandForm.whatsapp_number} onChange={(e) => setBrandForm({ ...brandForm, whatsapp_number: e.target.value })} placeholder="e.g., 27821234567" />
              </div>
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
                brands.map((b) => (
                  <Card key={b.id} className="p-3 flex items-center gap-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.whatsapp_number} {b.location ? `· ${b.location}` : ''}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {b.is_approved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Approved</span>}
                        {b.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">Featured</span>}
                        {b.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">Verified</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEditBrand(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteBrand(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </Card>
                ))
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
                <div className="flex items-center gap-3">
                  {itemForm.product_image && <img src={itemForm.product_image} alt="" className="w-20 h-20 rounded-lg object-cover" />}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:border-primary text-sm">
                    {uploadingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{itemForm.product_image ? 'Replace' : 'Upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleItemImageUpload} disabled={uploadingItem} />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Product URL (optional)</Label>
                <Input value={itemForm.product_url} onChange={(e) => setItemForm({ ...itemForm, product_url: e.target.value })} placeholder="https://…" />
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
              <h2 className="font-semibold">All items ({items.length})</h2>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {items.map((it) => {
                    const brand = brands.find((b) => b.id === it.linked_brand_id);
                    return (
                      <Card key={it.id} className="p-2">
                        <img src={it.product_image} alt={it.product_name ?? ''} className="w-full aspect-square object-cover rounded-md" />
                        <p className="text-sm font-medium mt-2 truncate">{it.product_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">{brand?.name ?? it.brand_name}</p>
                        {it.price != null && <p className="text-xs">R{it.price}</p>}
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => startEditItem(it)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => deleteItem(it.id)}>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
