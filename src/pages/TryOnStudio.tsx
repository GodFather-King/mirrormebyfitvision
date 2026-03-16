import { useState, useEffect, useCallback } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { useTryOnWithRetry } from '@/hooks/useTryOnWithRetry';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import TryOnAvatarViewer from '@/components/tryon/TryOnAvatarViewer';
import TryOnItemCard from '@/components/tryon/TryOnItemCard';
import AvatarCreatorDialog from '@/components/tryon/AvatarCreatorDialog';
import MeasurementsDisplay from '@/components/tryon/MeasurementsDisplay';
import SaveOutfitDialog from '@/components/tryon/SaveOutfitDialog';
import OutfitLayerPanel, { type LayerItem } from '@/components/tryon/OutfitLayerPanel';
import WardrobeUploader from '@/components/WardrobeUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Search, Shirt, Upload, UserPlus, Sparkles, Save, FolderHeart, Layers, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useTryOnUsage } from '@/hooks/useTryOnUsage';

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  original_image_url: string;
  processed_image_url: string | null;
  color: string | null;
  is_favorite: boolean;
  chest_width_cm?: number | null;
  waist_width_cm?: number | null;
  hip_width_cm?: number | null;
  sleeve_length_cm?: number | null;
  shoulder_width_cm?: number | null;
  garment_length_cm?: number | null;
  fit_type?: string | null;
}


const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '✨' },
  { value: 'tops', label: 'Tops', emoji: '👕' },
  { value: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { value: 'dresses', label: 'Dresses', emoji: '👗' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
];

const TryOnStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { 
    avatarUrl, 
    hasAvatar, 
    isLoading: avatarLoading, 
    updateAvatarFromGeneration,
    updateAvatarView,
    measurements,
    avatar,
    canCreateNewAvatar,
    clearAvatar,
    refreshAvatar,
  } = useAvatar();

  const { remaining, isFreePlan, isAtLimit, recordUsage, FREE_DAILY_LIMIT, dailyCount } = useTryOnUsage();

  // Data states
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);

  // UI states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bottomNavTab, setBottomNavTab] = useState('home');

  // Try-on mode: 'single' (default) or 'overlay'
  const [tryOnMode, setTryOnMode] = useState<'single' | 'overlay'>('single');

  // Try-on states
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentTryOnItem, setCurrentTryOnItem] = useState<string | null>(null);
  const [currentTryOnName, setCurrentTryOnName] = useState<string | null>(null);
  const [currentTryOnContext, setCurrentTryOnContext] = useState<{
    clothingImageUrl: string | null;
    clothingType: string;
    clothingName: string;
  } | null>(null);

  const { invoke: tryOnInvoke, cancel: cancelTryOn } = useTryOnWithRetry();

  // Outfit builder — accumulate items tried on in this session
  const [outfitItems, setOutfitItems] = useState<{ id: string; name: string; brandName?: string; productUrl?: string }[]>([]);

  // Overlay mode: layered items queue
  const [layerItems, setLayerItems] = useState<LayerItem[]>([]);

  // Uploader states
  const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);
  const [isWardrobeUploaderOpen, setIsWardrobeUploaderOpen] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [showDetailedMeasurements, setShowDetailedMeasurements] = useState(false);
  const [currentAvatarView, setCurrentAvatarView] = useState<'front' | 'side' | 'back'>('front');
  const [isSaveOutfitOpen, setIsSaveOutfitOpen] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Handle saved outfit preview from navigation
  useEffect(() => {
    const state = location.state as { savedOutfitPreview?: string; outfitName?: string } | null;
    if (state?.savedOutfitPreview) {
      setTryOnUrl(state.savedOutfitPreview);
      setCurrentTryOnName(state.outfitName || 'Saved Outfit');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch wardrobe items
  useEffect(() => {
    if (user) {
      fetchWardrobeItems();
    }
  }, [user]);

  const fetchWardrobeItems = async () => {
    setLoadingWardrobe(true);
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id, name, category, original_image_url, processed_image_url, color, is_favorite, fit_type, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching wardrobe:', error);
    } else {
      setWardrobeItems(data || []);
    }
    setLoadingWardrobe(false);
  };


  // Handle avatar generation
  const handlePhotoSelected = async (photoDataUrl: string) => {
    setIsGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageUrl: photoDataUrl }
      });

      if (error) throw error;

      if (data?.avatarUrl && data?.measurements) {
        await updateAvatarFromGeneration(data.avatarUrl, data.measurements);
        toast.success('Avatar created successfully!');
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      toast.error('Failed to generate avatar');
    } finally {
      setIsGeneratingAvatar(false);
      setIsPhotoUploaderOpen(false);
    }
  };

  // ---- OVERLAY MODE: Add item to layer ----
  const handleAddToLayer = (
    itemId: string,
    itemName: string,
    itemCategory: string,
    imageUrl: string,
    brandName?: string,
  ) => {
    setLayerItems(prev => {
      // Replace if same category already in stack (e.g. swap tops)
      const filtered = prev.filter(i => !(i.category === itemCategory && i.id !== itemId));
      const exists = filtered.some(i => i.id === itemId);
      if (exists) return filtered;
      return [...filtered, { id: itemId, name: itemName, category: itemCategory, imageUrl, brandName }];
    });
    toast.success(`Added ${itemName} to outfit`);
  };

  const handleRemoveFromLayer = (id: string) => {
    setLayerItems(prev => prev.filter(i => i.id !== id));
  };

  // ---- OVERLAY MODE: Try on full outfit ----
  const handleTryOnOverlayOutfit = useCallback(async () => {
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first to try on clothes');
      setIsPhotoUploaderOpen(true);
      return;
    }
    if (layerItems.length < 2) {
      toast.error('Add at least 2 items to try on a full outfit');
      return;
    }
    if (isAtLimit) {
      toast.error('You\'ve used your 5 free try-ons for today. Come back tomorrow or upgrade for unlimited!', { duration: 6000 });
      return;
    }

    setIsTryingOn(true);
    setCurrentTryOnName('Full Outfit');

    try {
      // Prepare all clothing images
      const clothingItemsPayload = await Promise.all(
        layerItems.map(async (item) => {
          const preparedUrl = await prepareImageForEdgeFunction(item.imageUrl);
          return {
            name: item.name,
            category: item.category,
            color: null,
            originalImageUrl: preparedUrl,
            processedImageUrl: null,
          };
        })
      );

      const body: Record<string, any> = {
        avatarUrl,
        clothingItems: clothingItemsPayload,
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

      const result = await tryOnInvoke({ body, functionName: 'wardrobe-try-on' });

      if (result?.tryOnUrl) {
        setTryOnUrl(result.tryOnUrl);
        // Sync outfit items for saving
        setOutfitItems(layerItems.map(i => ({
          id: i.id,
          name: i.name,
          brandName: i.brandName,
        })));
        await recordUsage('overlay-outfit');
        if (isFreePlan) {
          const newRemaining = FREE_DAILY_LIMIT - (dailyCount + 1);
          if (newRemaining <= 0) {
            toast.info('You\'ve used all your free try-ons today! Upgrade for unlimited.', { duration: 6000 });
          } else {
            toast.success(`Outfit preview ready! (${newRemaining} free try-on${newRemaining === 1 ? '' : 's'} left today)`);
          }
        } else {
          toast.success('Outfit preview ready!');
        }
      }
    } catch (error: any) {
      console.error('Overlay try-on error:', error);
      if (error?.message?.includes('timed out')) {
        toast.error('Try-on timed out. Try fewer items or clearer images.', { duration: 6000 });
      } else {
        toast.error('Could not complete outfit try-on');
      }
    } finally {
      setIsTryingOn(false);
      setIsRetrying(false);
    }
  }, [avatarUrl, hasAvatar, measurements, layerItems, isAtLimit, isFreePlan, dailyCount]);

  // ---- SINGLE MODE: Handle try-on (existing) ----
  const handleTryOn = useCallback(async (
    itemId: string,
    itemName: string,
    itemCategory: string,
    imageUrl: string,
    isFromBrand: boolean = false,
    clothingMeasurements?: {
      chest_width_cm?: number | null;
      waist_width_cm?: number | null;
      hip_width_cm?: number | null;
      sleeve_length_cm?: number | null;
      shoulder_width_cm?: number | null;
      garment_length_cm?: number | null;
      fit_type?: string | null;
    }
  ) => {
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first to try on clothes');
      setIsPhotoUploaderOpen(true);
      return;
    }

    if (isAtLimit) {
      toast.error('You\'ve used your 5 free try-ons for today. Come back tomorrow or upgrade for unlimited!', { duration: 6000 });
      return;
    }

    setIsTryingOn(true);
    setCurrentTryOnItem(itemId);
    setCurrentTryOnName(itemName);

    try {
      const preparedImageUrl = await prepareImageForEdgeFunction(imageUrl);

      const body: Record<string, any> = {
        avatarUrl: avatarUrl,
        clothingName: itemName,
        clothingType: itemCategory,
        clothingImageUrl: preparedImageUrl,
      };

      if (clothingMeasurements) {
        body.clothingMeasurements = clothingMeasurements;
      }

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

      const functionName = isFromBrand ? 'try-on-clothing' : 'wardrobe-try-on';
      const result = await tryOnInvoke({ body, functionName });

      if (result?.tryOnUrl) {
        setTryOnUrl(result.tryOnUrl);
        setCurrentTryOnContext({
          clothingImageUrl: preparedImageUrl,
          clothingType: itemCategory,
          clothingName: itemName,
        });
        setOutfitItems(prev => {
          const exists = prev.some(i => i.id === itemId);
          if (exists) return prev;
          return [...prev, {
            id: itemId,
            name: itemName,
          }];
        });
        await recordUsage(itemId);
        if (isFreePlan) {
          const newRemaining = FREE_DAILY_LIMIT - (dailyCount + 1);
          if (newRemaining <= 0) {
            toast.info('You\'ve used all your free try-ons today! Upgrade for unlimited.', { duration: 6000 });
          } else {
            toast.success(`Trying on ${itemName}! (${newRemaining} free try-on${newRemaining === 1 ? '' : 's'} left today)`);
          }
        } else {
          toast.success(`Trying on ${itemName}!`);
        }
      }
    } catch (error: any) {
      console.error('Try-on error:', error);
      const errMsg = error?.message || '';
      if (errMsg.includes('timed out') || errMsg.includes('too long')) {
        toast.error('Try-on timed out. Please try again with a clearer image.', { duration: 6000 });
      } else if (errMsg.includes('Rate limit') || errMsg.includes('429') || error?.status === 429) {
        toast.error('Too many requests — please wait 30 seconds before trying again.', { duration: 8000 });
      } else if (errMsg.includes('credits') || errMsg.includes('402') || error?.status === 402) {
        toast.error('AI credits needed. Please add funds in Settings → Workspace → Usage.', { duration: 8000 });
      } else {
        toast.error(errMsg || 'Could not complete try-on');
      }
    } finally {
      setIsTryingOn(false);
      setIsRetrying(false);
    }
  }, [avatarUrl, hasAvatar, measurements]);

  // Handle wardrobe item click
  const handleWardrobeItemClick = (id: string) => {
    const item = wardrobeItems.find(i => i.id === id);
    if (!item) return;

    if (tryOnMode === 'overlay') {
      handleAddToLayer(
        item.id,
        item.name,
        item.category,
        item.processed_image_url || item.original_image_url,
      );
    } else {
      handleTryOn(
        item.id,
        item.name,
        item.category,
        item.processed_image_url || item.original_image_url,
        false,
        {
          chest_width_cm: item.chest_width_cm,
          waist_width_cm: item.waist_width_cm,
          hip_width_cm: item.hip_width_cm,
          sleeve_length_cm: item.sleeve_length_cm,
          shoulder_width_cm: item.shoulder_width_cm,
          garment_length_cm: item.garment_length_cm,
          fit_type: item.fit_type,
        }
      );
    }
  };


  // Handle toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const item = wardrobeItems.find(i => i.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('wardrobe_items')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update favorite');
    } else {
      setWardrobeItems(items =>
        items.map(i => (i.id === id ? { ...i, is_favorite: !i.is_favorite } : i))
      );
    }
  };

  // Clear try-on
  const handleClearTryOn = () => {
    setTryOnUrl(null);
    setCurrentTryOnItem(null);
    setCurrentTryOnName(null);
    setCurrentTryOnContext(null);
    setOutfitItems([]);
  };

  // Handle view generation callback
  const handleViewGenerated = useCallback((view: 'front' | 'side' | 'back', url: string) => {
    updateAvatarView(view, url);
  }, [updateAvatarView]);

  // Handle deleting the current avatar
  const handleDeleteAvatar = useCallback(async () => {
    if (!avatar?.id) {
      clearAvatar();
      toast.success('Avatar removed');
      return;
    }

    const { error } = await supabase
      .from('saved_avatars')
      .delete()
      .eq('id', avatar.id);

    if (error) {
      console.error('Error deleting avatar:', error);
      toast.error('Failed to delete avatar');
      return;
    }

    clearAvatar();
    setTryOnUrl(null);
    await refreshAvatar();
    toast.success('Avatar deleted');
  }, [avatar, clearAvatar, refreshAvatar]);

  // Filter items
  const filteredWardrobe = wardrobeItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });


  // Check if item is in layer
  const isInLayer = (id: string) => layerItems.some(i => i.id === id);

  const isLoading = authLoading || avatarLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative pt-20 pb-24 px-4 max-w-lg md:max-w-6xl mx-auto md:grid md:grid-cols-2 md:gap-8">
        {/* Left column: Avatar + Controls */}
        <div className="mb-4 md:mb-0 space-y-3 md:sticky md:top-20 md:self-start">
          <TryOnAvatarViewer
            avatarUrl={avatarUrl}
            tryOnUrl={tryOnUrl}
            isTryingOn={isTryingOn}
            isRetrying={isRetrying}
            isLoading={avatarLoading || isGeneratingAvatar}
            hasAvatar={hasAvatar}
            currentItemName={currentTryOnName}
            onClearTryOn={tryOnUrl ? handleClearTryOn : undefined}
            onCreateAvatar={() => setIsPhotoUploaderOpen(true)}
            onDeleteAvatar={handleDeleteAvatar}
            onCancelTryOn={() => { cancelTryOn(); setIsTryingOn(false); setIsRetrying(false); }}
            onViewChange={setCurrentAvatarView}
            onViewGenerated={handleViewGenerated}
            avatarViews={{
              front: avatar?.front_view_url || avatarUrl,
              side: avatar?.side_view_url || null,
              back: avatar?.back_view_url || null,
            }}
            tryOnContext={currentTryOnContext}
          />

          {hasAvatar && (
            <div 
              className="cursor-pointer"
              onClick={() => setShowDetailedMeasurements(!showDetailedMeasurements)}
            >
              <MeasurementsDisplay 
                compact={!showDetailedMeasurements} 
                className="animate-in fade-in slide-in-from-bottom-2 duration-300" 
              />
              <p className="text-[10px] text-center text-muted-foreground mt-1">
                {showDetailedMeasurements ? 'Tap to collapse' : 'Tap for full measurements'}
              </p>
            </div>
          )}

          {/* Scan & Try-On + Save Outfit & View Outfits */}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/scan')}
              className="text-xs h-8"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Scan Clothing
            </Button>
            <Button
              size="sm"
              onClick={() => setIsSaveOutfitOpen(true)}
              disabled={!tryOnUrl}
              className="flex-1 bg-gradient-to-r from-primary to-secondary text-xs h-8 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Outfit
              {outfitItems.length > 1 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] h-4">
                  {outfitItems.length} items
                </Badge>
              )}
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

        {/* Try-On Mode Toggle */}
        {hasAvatar && (
          <div className="glass-card p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <Label htmlFor="overlay-mode" className="text-xs font-medium cursor-pointer">
                  Outfit Builder Mode
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {tryOnMode === 'single' ? 'Single' : 'Overlay'}
                </span>
                <Switch
                  id="overlay-mode"
                  checked={tryOnMode === 'overlay'}
                  onCheckedChange={(checked) => {
                    setTryOnMode(checked ? 'overlay' : 'single');
                    if (!checked) {
                      setLayerItems([]);
                    }
                  }}
                />
              </div>
            </div>
            {tryOnMode === 'overlay' && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Tap items to add to your outfit — they'll layer together automatically
              </p>
            )}
          </div>
        )}

        {/* Overlay Layer Panel */}
        {tryOnMode === 'overlay' && hasAvatar && (
          <div className="mb-4">
            <OutfitLayerPanel
              items={layerItems}
              onRemoveItem={handleRemoveFromLayer}
              onTryOnOutfit={handleTryOnOverlayOutfit}
              isTryingOn={isTryingOn}
              hasAvatar={hasAvatar}
            />
          </div>
        )}

        {/* Free plan usage nudge */}
        {isFreePlan && hasAvatar && (
          <div className={`glass-card p-3 mb-4 flex items-center justify-between ${isAtLimit ? 'ring-1 ring-destructive/40' : ''}`}>
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 shrink-0 ${isAtLimit ? 'text-destructive' : 'text-primary'}`} />
              <span className="text-xs text-muted-foreground">
                {remaining > 0
                  ? `${remaining}/${FREE_DAILY_LIMIT} free try-ons left today`
                  : 'Try-ons used up — come back tomorrow!'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-7 px-2"
              onClick={() => navigate('/pricing')}
            >
              Go Unlimited
            </Button>
          </div>
        )}

        {/* Right column: Wardrobe */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display font-semibold text-sm flex items-center gap-1.5 flex-1">
              <Shirt className="w-4 h-4" />
              My Wardrobe
            </h3>
            <Button
              size="icon"
              onClick={() => setIsWardrobeUploaderOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/30 border-border/50"
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'secondary'}
                className={`
                  cursor-pointer shrink-0 px-3 py-1.5 text-sm transition-colors
                  ${selectedCategory === cat.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                  }
                `}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.emoji} {cat.label}
              </Badge>
            ))}
          </div>

          {/* Wardrobe Items */}
          {loadingWardrobe ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredWardrobe.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Shirt className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">
                {wardrobeItems.length === 0 ? 'Your wardrobe is empty' : 'No matches found'}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {wardrobeItems.length === 0
                  ? 'Upload your clothes to try them on'
                  : 'Try a different search or category'}
              </p>
              {wardrobeItems.length === 0 && (
                <Button onClick={() => setIsWardrobeUploaderOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Clothes
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {filteredWardrobe.map((item) => (
                <TryOnItemCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  category={item.category}
                  imageUrl={item.processed_image_url || item.original_image_url}
                  isFavorite={item.is_favorite}
                  isSelected={tryOnMode === 'overlay' ? isInLayer(item.id) : currentTryOnItem === item.id}
                  isTryingOn={isTryingOn && currentTryOnItem === item.id}
                  onTryOn={handleWardrobeItemClick}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation activeTab={bottomNavTab} onTabChange={setBottomNavTab} />

      {/* Floating Add Avatar Button */}
      {hasAvatar && canCreateNewAvatar && (
        <Button
          onClick={() => setIsPhotoUploaderOpen(true)}
          className="fixed bottom-24 right-4 z-40 rounded-full w-14 h-14 p-0 bg-primary hover:bg-primary/90 shadow-lg"
          title="Create another avatar"
        >
          <UserPlus className="w-6 h-6" />
        </Button>
      )}

      {/* Avatar Creator Dialog */}
      <AvatarCreatorDialog
        isOpen={isPhotoUploaderOpen}
        onClose={() => setIsPhotoUploaderOpen(false)}
        onPhotoSelected={handlePhotoSelected}
        isProcessing={isGeneratingAvatar}
      />

      {/* Wardrobe Uploader */}
      <WardrobeUploader
        isOpen={isWardrobeUploaderOpen}
        onClose={() => setIsWardrobeUploaderOpen(false)}
        onSuccess={fetchWardrobeItems}
      />

      {/* Save Outfit Dialog */}
      {tryOnUrl && (
        <SaveOutfitDialog
          isOpen={isSaveOutfitOpen}
          onClose={() => setIsSaveOutfitOpen(false)}
          previewUrl={tryOnUrl}
          itemIds={outfitItems.map(i => i.id)}
          brandNames={outfitItems.map(i => i.brandName).filter(Boolean) as string[]}
          productLinks={outfitItems
            .filter(i => i.brandName)
            .map(i => ({ name: i.name, brand: i.brandName }))}
        />
      )}

      
    </div>
  );
};

export default TryOnStudio;
