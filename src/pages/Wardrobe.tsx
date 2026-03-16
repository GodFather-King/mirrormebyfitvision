import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import WardrobeItem from '@/components/WardrobeItem';
import WardrobeUploader from '@/components/WardrobeUploader';
import AvatarPreviewCard from '@/components/AvatarPreviewCard';
import AvatarRequiredBanner from '@/components/AvatarRequiredBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ArrowLeft, Shirt, Sparkles, RefreshCw, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getCachedWardrobe, setCachedWardrobe, clearWardrobeCache } from '@/lib/wardrobeCache';

interface WardrobeItemData {
  id: string;
  name: string;
  category: string;
  original_image_url: string;
  processed_image_url: string | null;
  color: string | null;
  is_favorite: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '✨' },
  { value: 'tops', label: 'Tops', emoji: '👕' },
  { value: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { value: 'dresses', label: 'Dresses', emoji: '👗' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'accessories', label: 'Accessories', emoji: '👜' },
];

const Wardrobe = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { avatarUrl, hasAvatar, isLoading: avatarLoading } = useAvatar();
  
  const [items, setItems] = useState<WardrobeItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('wardrobe');

  const handlePullRefresh = useCallback(async () => {
    clearWardrobeCache();
    setLoading(true);
    // fetchItems is defined below but referenced via closure
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id, name, category, original_image_url, processed_image_url, color, is_favorite, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      setItems(data || []);
      setCachedWardrobe(data || []);
    }
    setLoading(false);
  }, []);

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    // Load from cache first for instant display
    const cached = getCachedWardrobe();
    if (cached && cached.length > 0) {
      setItems(cached as WardrobeItemData[]);
      setLoading(false);
    }

    try {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('id, name, category, original_image_url, processed_image_url, color, is_favorite, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching wardrobe:', error);
        if (!cached) toast.error('Failed to load wardrobe');
      } else {
        setItems(data || []);
        setCachedWardrobe(data || []);
      }
    } catch (err) {
      console.error('Network error fetching wardrobe:', err);
      if (!cached) toast.error('Network error — pull to refresh');
    }
    setLoading(false);
  };

  const handleToggleFavorite = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('wardrobe_items')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update favorite');
    } else {
      setItems(items.map(i => 
        i.id === id ? { ...i, is_favorite: !i.is_favorite } : i
      ));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete item');
    } else {
      setItems(items.filter(i => i.id !== id));
      setSelectedItems(selectedItems.filter(i => i !== id));
      toast.success('Item deleted');
    }
    setDeletingId(null);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleTryOn = () => {
    if (selectedItems.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    
    // Hard block if no avatar exists
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first by uploading a photo on the home page');
      navigate('/');
      return;
    }
    
    // Navigate to home with selected items and avatar info
    const selectedItemsData = items.filter(i => selectedItems.includes(i.id));
    navigate('/', { state: { wardrobeItems: selectedItemsData, savedAvatarUrl: avatarUrl } });
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-auto" ref={containerRef}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      {/* Pull-to-refresh indicator */}
      <div
        className="fixed left-0 right-0 flex justify-center z-50 transition-transform duration-200"
        style={{
          top: '4rem',
          transform: `translateY(${pullDistance > 0 || isRefreshing ? Math.max(pullDistance, 8) : -40}px)`,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        }}
      >
        <div className="bg-card border border-border rounded-full p-2 shadow-lg">
          <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      </div>

      <main className="relative pt-20 pb-32 px-4 max-w-md md:max-w-6xl mx-auto"
        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined, transition: pullDistance > 0 ? 'none' : 'transform 0.2s' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl gradient-text">My Wardrobe</h1>
            <p className="text-muted-foreground text-sm">{items.length} items</p>
          </div>
        </div>

        {/* Avatar preview + required banner */}
        {hasAvatar ? (
          <AvatarPreviewCard className="mb-4" />
        ) : (
          <AvatarRequiredBanner className="mb-4" />
        )}

        {/* Action buttons — clearly separated */}
        <TooltipProvider delayDuration={0}>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Personal Wardrobe */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                👕 Personal Wardrobe
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsUploaderOpen(true)}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add to My Wardrobe
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  Upload clothes you already own to your personal wardrobe.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Store Scanning */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                📷 Store Scanning
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate('/scan')}
                    variant="outline"
                    className="w-full border-primary/40 hover:bg-primary/10"
                    size="lg"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Clothing in Store
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-center">
                  Scan clothing in a store to try it on instantly with your avatar.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
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

        {/* Items grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-xl w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Shirt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">
              {selectedCategory === 'all' ? 'Your wardrobe is empty' : `No ${selectedCategory} yet`}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Upload your clothes to try them on
            </p>
            <Button onClick={() => setIsUploaderOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((item) => {
              const imageUrl = item.processed_image_url && item.processed_image_url.startsWith('http')
                ? item.processed_image_url
                : item.original_image_url;
              const isProcessing = !item.processed_image_url;
              return (
                <WardrobeItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  category={item.category}
                  imageUrl={imageUrl}
                  color={item.color}
                  isFavorite={item.is_favorite}
                  isSelected={selectedItems.includes(item.id)}
                  isProcessing={isProcessing}
                  onSelect={handleSelectItem}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Try On Button - Fixed at bottom (disabled if no avatar) */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-md md:max-w-6xl mx-auto">
            <Button
              onClick={handleTryOn}
              className="w-full bg-gradient-to-r from-primary to-secondary shadow-lg"
              disabled={!hasAvatar}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {hasAvatar
                ? `Try On ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`
                : 'Create avatar to try on'}
            </Button>
          </div>
        </div>
      )}

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <WardrobeUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={fetchItems}
      />
    </div>
  );
};

export default Wardrobe;
