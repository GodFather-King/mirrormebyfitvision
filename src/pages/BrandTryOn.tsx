import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { useTryOnWithRetry } from '@/hooks/useTryOnWithRetry';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import TryOnAvatarViewer from '@/components/tryon/TryOnAvatarViewer';
import AvatarCreatorDialog from '@/components/tryon/AvatarCreatorDialog';
import SaveOutfitDialog from '@/components/tryon/SaveOutfitDialog';
import RecentlyTriedItems from '@/components/tryon/RecentlyTriedItems';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, ExternalLink, Loader2, Upload, Sparkles, Link, Save, FolderHeart } from 'lucide-react';
import { toast } from 'sonner';

const BRANDS = [
  { name: 'SHEIN', url: 'https://www.shein.com', color: 'from-black to-zinc-800', emoji: '🛍️' },
  { name: 'ZARA', url: 'https://www.zara.com', color: 'from-zinc-900 to-zinc-700', emoji: '👔' },
  { name: 'H&M', url: 'https://www.hm.com', color: 'from-red-700 to-red-500', emoji: '👗' },
  { name: 'Mr Price', url: 'https://www.mrprice.co.za', color: 'from-orange-600 to-orange-400', emoji: '🏷️' },
  { name: 'BASH (TFG)', url: 'https://bash.com', color: 'from-purple-700 to-purple-500', emoji: '✨' },
  { name: 'Superbalist', url: 'https://superbalist.com', color: 'from-sky-600 to-sky-400', emoji: '🛒' },
  { name: 'Truworths', url: 'https://www.truworths.co.za', color: 'from-rose-700 to-rose-500', emoji: '👠' },
  { name: 'Woolworths', url: 'https://www.woolworths.co.za', color: 'from-emerald-700 to-emerald-500', emoji: '🌿' },
  { name: 'PEP', url: 'https://www.pepstores.com', color: 'from-red-600 to-yellow-500', emoji: '🏪' },
  { name: 'Edgars', url: 'https://www.edgars.co.za', color: 'from-indigo-700 to-indigo-500', emoji: '🛍️' },
];

const CATEGORIES = [
  { value: 'tops', label: 'Top / Shirt' },
  { value: 'bottoms', label: 'Bottoms / Pants' },
  { value: 'dresses', label: 'Dress' },
  { value: 'outerwear', label: 'Jacket / Outerwear' },
];

const BrandTryOn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    avatarUrl,
    hasAvatar,
    isLoading: avatarLoading,
    updateAvatarFromGeneration,
    updateAvatarView,
    measurements,
    avatar,
  } = useAvatar();

  const [bottomNavTab, setBottomNavTab] = useState('shop');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [clipboardChecked, setClipboardChecked] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('tops');
  const [productUrl, setProductUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Try-on states
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [currentTryOnName, setCurrentTryOnName] = useState<string | null>(null);
  const [currentProductUrl, setCurrentProductUrl] = useState<string | null>(null);
  const [currentClothingImageUrl, setCurrentClothingImageUrl] = useState<string | null>(null);
  const [currentClothingType, setCurrentClothingType] = useState<string>('tops');
  const [isSaveOutfitOpen, setIsSaveOutfitOpen] = useState(false);

  const { invoke: tryOnInvoke, cancel: cancelTryOn } = useTryOnWithRetry();

  // Avatar creator
  const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelected = async (photoDataUrl: string) => {
    setIsGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageUrl: photoDataUrl },
      });
      if (error) throw error;
      if (data?.avatarUrl && data?.measurements) {
        await updateAvatarFromGeneration(data.avatarUrl, data.measurements);
        toast.success('Avatar created successfully!');
      }
    } catch {
      toast.error('Failed to generate avatar');
    } finally {
      setIsGeneratingAvatar(false);
      setIsPhotoUploaderOpen(false);
    }
  };

  // Auto-read clipboard for product URL when upload dialog opens
  useEffect(() => {
    if (!isUploadOpen || clipboardChecked) return;
    setClipboardChecked(true);

    const readClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && /^https?:\/\//i.test(text.trim())) {
          setProductUrl(text.trim());
          toast.info('Product URL detected from clipboard!', { duration: 2000 });
        }
      } catch {
        // Clipboard permission denied – silent fail
      }
    };
    readClipboard();
  }, [isUploadOpen, clipboardChecked]);

  const handleBrandClick = (brand: typeof BRANDS[0]) => {
    setSelectedBrand(brand.name);
    window.open(brand.url, '_blank');
    setClipboardChecked(false);
    setIsUploadOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleTryOn = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error('Please upload a product screenshot');
      return;
    }
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first');
      setIsPhotoUploaderOpen(true);
      return;
    }

    setIsTryingOn(true);
    const displayName = itemName || `${selectedBrand || 'Brand'} item`;
    setCurrentTryOnName(displayName);
    setCurrentProductUrl(productUrl || null);
    setCurrentClothingType(category);
    setIsUploadOpen(false);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });

      const body: Record<string, any> = {
        avatarUrl,
        clothingName: displayName,
        clothingType: category,
        clothingImageUrl: base64,
      };

      if (measurements) {
        body.bodyMeasurements = {
          height_cm: measurements.height_cm,
          chest_cm: measurements.chest_cm,
          waist_cm: measurements.waist_cm,
          hips_cm: measurements.hips_cm,
          shoulders_cm: measurements.shoulders_cm,
          inseam_cm: measurements.inseam_cm,
          body_type: measurements.body_type,
        };
      }

      const result = await tryOnInvoke({ body, functionName: 'try-on-clothing' });

      if (result?.tryOnUrl) {
        setTryOnUrl(result.tryOnUrl);
        setCurrentClothingImageUrl(base64);
        toast.success(`Trying on ${displayName}!`);

        // Save brand item to database
        if (user) {
          await supabase.from('brand_items').insert({
            user_id: user.id,
            brand_name: selectedBrand || 'Other',
            product_name: itemName || null,
            product_image: base64.substring(0, 500),
            product_url: productUrl || null,
            category,
            try_on_result_url: result.tryOnUrl,
          });
        }
      }
    } catch (error: any) {
      console.error('Try-on error:', error);
      if (error?.message?.includes('timed out') || error?.message?.includes('too long')) {
        toast.error('Try-on timed out. Please try again with a clearer image.', { duration: 6000 });
      } else {
        toast.error('Could not complete try-on. Tap to retry.');
      }
    } finally {
      setIsTryingOn(false);
      setIsRetrying(false);
    }
  };

  const handleClearTryOn = () => {
    setTryOnUrl(null);
    setCurrentTryOnName(null);
    setCurrentProductUrl(null);
    setCurrentClothingImageUrl(null);
  };

  const handleViewGenerated = useCallback(
    (view: 'front' | 'side' | 'back', url: string) => updateAvatarView(view, url),
    [updateAvatarView]
  );

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setItemName('');
    setCategory('tops');
    setProductUrl('');
    setSelectedBrand(null);
    setClipboardChecked(false);
  };

  if (authLoading || avatarLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
      </div>

      <Header />

      <main className="relative pt-20 pb-24 px-4 max-w-lg md:max-w-6xl mx-auto">
        {/* Title */}
        <div className="mb-5">
          <h1 className="text-xl font-display font-bold text-foreground">Shop by Brand</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse a brand, screenshot a product, and try it on your avatar
          </p>
        </div>

        {/* How it works */}
        <div className="glass-card p-4 mb-5 space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            How it works
          </h3>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Tap a brand below to open their website</li>
            <li>Find a product you like and <strong>screenshot</strong> it</li>
            <li>Upload the screenshot here to <strong>try it on</strong> your avatar</li>
          </ol>
        </div>

        {/* Avatar viewer - always visible when user has an avatar */}
        <div className="mb-5">
          <TryOnAvatarViewer
            avatarUrl={avatarUrl}
            tryOnUrl={tryOnUrl}
            isTryingOn={isTryingOn}
            isRetrying={isRetrying}
            isLoading={avatarLoading}
            onCancelTryOn={() => { cancelTryOn(); setIsTryingOn(false); setIsRetrying(false); }}
            hasAvatar={hasAvatar}
            currentItemName={currentTryOnName}
            productUrl={currentProductUrl}
            onClearTryOn={tryOnUrl ? handleClearTryOn : undefined}
            onCreateAvatar={() => setIsPhotoUploaderOpen(true)}
            onViewChange={() => {}}
            onViewGenerated={handleViewGenerated}
            avatarViews={{
              front: avatar?.front_view_url || avatarUrl,
              side: avatar?.side_view_url || null,
              back: avatar?.back_view_url || null,
            }}
            tryOnContext={currentClothingImageUrl ? {
              clothingImageUrl: currentClothingImageUrl,
              clothingType: currentClothingType,
              clothingName: currentTryOnName || 'Item',
            } : null}
          />

          {/* View Original Product button - only show if no floating buy button already */}
          {tryOnUrl && currentProductUrl && (
            <p className="text-center text-[10px] text-muted-foreground mt-1">
              Tap "Buy Now" on the preview to visit the product page
            </p>
          )}

          {/* Save Outfit & My Outfits */}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() => setIsSaveOutfitOpen(true)}
              disabled={!tryOnUrl}
              className="flex-1 bg-gradient-to-r from-primary to-secondary text-xs h-8 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Outfit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/saved-outfits')}
              className="text-xs h-8"
            >
              <FolderHeart className="w-3.5 h-3.5 mr-1.5" />
              My Outfits
            </Button>
          </div>
        </div>

        {/* Recently Tried */}
        <RecentlyTriedItems />

        {/* Brand Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
          {BRANDS.map((brand) => (
            <button
              key={brand.name}
              onClick={() => handleBrandClick(brand)}
              className="glass-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-all active:scale-95"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-2xl`}
              >
                {brand.emoji}
              </div>
              <span className="text-sm font-semibold text-foreground">{brand.name}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Opens website
              </span>
            </button>
          ))}

          {/* Upload without brand */}
          <button
            onClick={() => { setSelectedBrand(null); setClipboardChecked(false); setIsUploadOpen(true); }}
            className="glass-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-all active:scale-95 border-2 border-dashed border-primary/30"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Any Brand</span>
            <span className="text-[10px] text-muted-foreground">Upload screenshot</span>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          MirrorMe is a visual fitting tool only. All purchases happen on the brand's website.
          We do not process payments or modify pricing.
        </p>
      </main>

      <BottomNavigation activeTab={bottomNavTab} onTabChange={setBottomNavTab} />

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => { if (!open) { resetUpload(); } setIsUploadOpen(open); }}>
        <DialogContent className="glass-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text">
              {selectedBrand ? `Try On from ${selectedBrand}` : 'Try On Any Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Screenshot upload */}
            <div className="space-y-2">
              <Label>Product Screenshot *</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-primary/50 ${
                  previewUrl ? 'border-primary' : 'border-border'
                }`}
              >
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                    <p className="text-xs text-muted-foreground mt-2">Click to change</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Upload product screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG from your gallery</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Item name */}
            <div className="space-y-2">
              <Label>Product Name (optional)</Label>
              <Input
                placeholder="e.g., Black Leather Jacket"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="bg-muted/50"
              />
            </div>

            {/* Product URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                Product URL (optional)
              </Label>
              <Input
                placeholder="https://www.shein.com/product/..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="bg-muted/50"
                type="url"
              />
              <p className="text-[10px] text-muted-foreground">
                Paste the product page link so you can find it again later
              </p>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!hasAvatar && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm text-primary">
                ⚠️ You need an avatar first.{' '}
                <button className="underline font-semibold" onClick={() => { setIsUploadOpen(false); setIsPhotoUploaderOpen(true); }}>
                  Create one now
                </button>
              </div>
            )}

            <Button
              onClick={handleTryOn}
              disabled={!selectedFile || isTryingOn}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              {isTryingOn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing try-on...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try On with MirrorMe
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Creator */}
      <AvatarCreatorDialog
        isOpen={isPhotoUploaderOpen}
        onClose={() => setIsPhotoUploaderOpen(false)}
        onPhotoSelected={handlePhotoSelected}
        isProcessing={isGeneratingAvatar}
      />

      {/* Save Outfit Dialog */}
      {tryOnUrl && (
        <SaveOutfitDialog
          isOpen={isSaveOutfitOpen}
          onClose={() => setIsSaveOutfitOpen(false)}
          previewUrl={tryOnUrl}
          itemIds={[]}
          brandNames={selectedBrand ? [selectedBrand] : []}
          productLinks={[{
            name: currentTryOnName || 'Brand item',
            url: currentProductUrl || undefined,
          }].filter(l => l.url)}
        />
      )}
    </div>
  );
};

export default BrandTryOn;
