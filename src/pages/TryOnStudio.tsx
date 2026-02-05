import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import TryOnAvatarViewer from '@/components/tryon/TryOnAvatarViewer';
import TryOnItemCard from '@/components/tryon/TryOnItemCard';
import AvatarCreatorDialog from '@/components/tryon/AvatarCreatorDialog';
import MeasurementsDisplay from '@/components/tryon/MeasurementsDisplay';
import WardrobeUploader from '@/components/WardrobeUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
 import { Loader2, Plus, Search, Shirt, Store, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  original_image_url: string;
  processed_image_url: string | null;
  color: string | null;
  is_favorite: boolean;
}

interface BrandProduct {
  id: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
  currency: string;
  brand_id: string;
  brand_name?: string;
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
  } = useAvatar();

  // Data states
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [brandProducts, setBrandProducts] = useState<BrandProduct[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // UI states
  const [activeTab, setActiveTab] = useState('wardrobe');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bottomNavTab, setBottomNavTab] = useState('home');

  // Try-on states
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [currentTryOnItem, setCurrentTryOnItem] = useState<string | null>(null);
  const [currentTryOnName, setCurrentTryOnName] = useState<string | null>(null);

  // Uploader states
  const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);
  const [isWardrobeUploaderOpen, setIsWardrobeUploaderOpen] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [showDetailedMeasurements, setShowDetailedMeasurements] = useState(false);
  const [currentAvatarView, setCurrentAvatarView] = useState<'front' | 'side' | 'back'>('front');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch wardrobe items
  useEffect(() => {
    if (user) {
      fetchWardrobeItems();
      fetchBrandProducts();
    }
  }, [user]);

  const fetchWardrobeItems = async () => {
    setLoadingWardrobe(true);
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wardrobe:', error);
    } else {
      setWardrobeItems(data || []);
    }
    setLoadingWardrobe(false);
  };

  const fetchBrandProducts = async () => {
    setLoadingBrands(true);
    const { data, error } = await supabase
      .from('brand_products')
      .select(`
        id, name, category, image_url, price, currency, brand_id,
        brands!inner(name, is_approved)
      `)
      .eq('is_active', true)
      .eq('brands.is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching brand products:', error);
    } else {
      const productsWithBrand = (data || []).map((p: any) => ({
        ...p,
        brand_name: p.brands?.name,
      }));
      setBrandProducts(productsWithBrand);
    }
    setLoadingBrands(false);
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

  // Handle try-on
  const handleTryOn = useCallback(async (
    itemId: string,
    itemName: string,
    itemCategory: string,
    imageUrl: string,
    isFromBrand: boolean = false
  ) => {
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first to try on clothes');
      setIsPhotoUploaderOpen(true);
      return;
    }

    setIsTryingOn(true);
    setCurrentTryOnItem(itemId);
    setCurrentTryOnName(itemName);

    try {
      // Convert relative/local URLs to base64 for AI gateway (it can't access preview server)
      const preparedImageUrl = await prepareImageForEdgeFunction(imageUrl);

      const { data, error } = await supabase.functions.invoke(
        isFromBrand ? 'try-on-clothing' : 'wardrobe-try-on',
        {
          body: {
            avatarUrl: avatarUrl,
            clothingName: itemName,
            clothingType: itemCategory,
            clothingImageUrl: preparedImageUrl,
          },
        }
      );

      if (error) throw error;

      if (data?.tryOnUrl) {
        setTryOnUrl(data.tryOnUrl);
        toast.success(`Trying on ${itemName}!`);
      }
    } catch (error) {
      console.error('Try-on error:', error);
      toast.error('Could not complete try-on');
    } finally {
      setIsTryingOn(false);
    }
  }, [avatarUrl, hasAvatar]);

  // Handle wardrobe try-on
  const handleWardrobeTryOn = (id: string) => {
    const item = wardrobeItems.find(i => i.id === id);
    if (item) {
      handleTryOn(
        item.id,
        item.name,
        item.category,
        item.processed_image_url || item.original_image_url,
        false
      );
    }
  };

  // Handle brand product try-on
  const handleBrandTryOn = (id: string) => {
    const product = brandProducts.find(p => p.id === id);
    if (product) {
      handleTryOn(
        product.id,
        product.name,
        product.category,
        product.image_url,
        true
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
  };

  // Handle view generation callback - persist to avatar context
  const handleViewGenerated = useCallback((view: 'front' | 'side' | 'back', url: string) => {
    updateAvatarView(view, url);
  }, [updateAvatarView]);

  // Filter items
  const filteredWardrobe = wardrobeItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredProducts = brandProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      <main className="relative pt-20 pb-24 px-4 max-w-lg mx-auto">
        {/* Avatar + Measurements Section */}
        <div className="mb-4 space-y-3">
          {/* Avatar Viewer with Front/Side/Back views */}
          <TryOnAvatarViewer
            avatarUrl={avatarUrl}
            tryOnUrl={tryOnUrl}
            isTryingOn={isTryingOn}
            isLoading={avatarLoading || isGeneratingAvatar}
            hasAvatar={hasAvatar}
            currentItemName={currentTryOnName}
            onClearTryOn={tryOnUrl ? handleClearTryOn : undefined}
            onCreateAvatar={() => setIsPhotoUploaderOpen(true)}
            onViewChange={setCurrentAvatarView}
            onViewGenerated={handleViewGenerated}
            avatarViews={{
              front: avatar?.front_view_url || avatarUrl,
              side: avatar?.side_view_url || null,
              back: avatar?.back_view_url || null,
            }}
          />

          {/* Measurements Display - Shows when avatar exists */}
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
        </div>

        {/* Wardrobe/Shop tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TabsList className="flex-1">
              <TabsTrigger value="wardrobe" className="flex-1 gap-1.5">
                <Shirt className="w-4 h-4" />
                My Wardrobe
              </TabsTrigger>
              <TabsTrigger value="shop" className="flex-1 gap-1.5">
                <Store className="w-4 h-4" />
                Brand Shop
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'wardrobe' && (
              <Button
                size="icon"
                onClick={() => setIsWardrobeUploaderOpen(true)}
                className="bg-gradient-to-r from-primary to-secondary shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
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

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe" className="mt-0">
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
              <div className="grid grid-cols-3 gap-2">
                {filteredWardrobe.map((item) => (
                  <TryOnItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    imageUrl={item.processed_image_url || item.original_image_url}
                    isFavorite={item.is_favorite}
                    isSelected={currentTryOnItem === item.id}
                    isTryingOn={isTryingOn && currentTryOnItem === item.id}
                    onTryOn={handleWardrobeTryOn}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shop Tab */}
          <TabsContent value="shop" className="mt-0">
            {loadingBrands ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Store className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No products found</h3>
                <p className="text-muted-foreground text-sm">
                  Check back soon for new items from our partners
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredProducts.map((product) => (
                  <TryOnItemCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    imageUrl={product.image_url}
                    price={product.price}
                    currency={product.currency}
                    brandName={product.brand_name}
                    isSelected={currentTryOnItem === product.id}
                    isTryingOn={isTryingOn && currentTryOnItem === product.id}
                    onTryOn={handleBrandTryOn}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab={bottomNavTab} onTabChange={setBottomNavTab} />

      {/* Floating Add Avatar Button - shown when user has an avatar but can create more */}
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
    </div>
  );
};

export default TryOnStudio;
