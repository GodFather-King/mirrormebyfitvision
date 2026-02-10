import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import TryOnAvatarViewer from '@/components/tryon/TryOnAvatarViewer';
import AvatarCreatorDialog from '@/components/tryon/AvatarCreatorDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, ExternalLink, Loader2, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const BRANDS = [
  { name: 'SHEIN', url: 'https://www.shein.com', color: 'from-black to-zinc-800', emoji: '🛍️' },
  { name: 'ZARA', url: 'https://www.zara.com', color: 'from-zinc-900 to-zinc-700', emoji: '👔' },
  { name: 'H&M', url: 'https://www.hm.com', color: 'from-red-700 to-red-500', emoji: '👗' },
  { name: 'Mr Price', url: 'https://www.mrprice.co.za', color: 'from-orange-600 to-orange-400', emoji: '🏷️' },
  { name: 'BASH (TFG)', url: 'https://bash.com', color: 'from-purple-700 to-purple-500', emoji: '✨' },
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
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('tops');
  const [isProcessing, setIsProcessing] = useState(false);

  // Try-on states
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [currentTryOnName, setCurrentTryOnName] = useState<string | null>(null);

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

  const handleBrandClick = (brand: typeof BRANDS[0]) => {
    setSelectedBrand(brand.name);
    window.open(brand.url, '_blank');
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
    setCurrentTryOnName(itemName || `${selectedBrand} item`);
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
        clothingName: itemName || `${selectedBrand} product`,
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

      const { data, error } = await supabase.functions.invoke('try-on-clothing', { body });
      if (error) throw error;

      if (data?.tryOnUrl) {
        setTryOnUrl(data.tryOnUrl);
        toast.success(`Trying on ${itemName || 'item'}!`);
      }
    } catch (error) {
      console.error('Try-on error:', error);
      toast.error('Could not complete try-on');
    } finally {
      setIsTryingOn(false);
    }
  };

  const handleClearTryOn = () => {
    setTryOnUrl(null);
    setCurrentTryOnName(null);
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
    setSelectedBrand(null);
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

      <main className="relative pt-20 pb-24 px-4 max-w-lg mx-auto">
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

        {/* Avatar viewer (shows try-on result) */}
        {(tryOnUrl || isTryingOn) && (
          <div className="mb-5">
            <TryOnAvatarViewer
              avatarUrl={avatarUrl}
              tryOnUrl={tryOnUrl}
              isTryingOn={isTryingOn}
              isLoading={false}
              hasAvatar={hasAvatar}
              currentItemName={currentTryOnName}
              onClearTryOn={tryOnUrl ? handleClearTryOn : undefined}
              onCreateAvatar={() => setIsPhotoUploaderOpen(true)}
              onViewChange={() => {}}
              onViewGenerated={handleViewGenerated}
              avatarViews={{
                front: avatar?.front_view_url || avatarUrl,
                side: avatar?.side_view_url || null,
                back: avatar?.back_view_url || null,
              }}
            />
          </div>
        )}

        {/* Brand Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
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
            onClick={() => { setSelectedBrand(null); setIsUploadOpen(true); }}
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

            {/* Category */}
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
    </div>
  );
};

export default BrandTryOn;
