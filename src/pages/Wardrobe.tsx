import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import WardrobeItem from '@/components/WardrobeItem';
import WardrobeUploader from '@/components/WardrobeUploader';
import AvatarPreviewCard from '@/components/AvatarPreviewCard';
import AvatarRequiredBanner from '@/components/AvatarRequiredBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowLeft, Shirt, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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
    setLoading(true);
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id, name, category, original_image_url, processed_image_url, color, is_favorite, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wardrobe:', error);
      toast.error('Failed to load wardrobe');
    } else {
      setItems(data || []);
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

  if (authLoading || loading || avatarLoading) {
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

      <main className="relative pt-20 pb-32 px-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl gradient-text">My Wardrobe</h1>
            <p className="text-muted-foreground text-sm">{items.length} items</p>
          </div>
          <Button
            size="icon"
            onClick={() => setIsUploaderOpen(true)}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Avatar preview + required banner */}
        {hasAvatar ? (
          <AvatarPreviewCard className="mb-4" />
        ) : (
          <AvatarRequiredBanner className="mb-4" />
        )}

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
        {filteredItems.length === 0 ? (
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
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              // Skip base64 processed images (too large), use original instead
              const imageUrl = item.processed_image_url && item.processed_image_url.startsWith('http')
                ? item.processed_image_url
                : item.original_image_url;
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
          <div className="max-w-md mx-auto">
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
