import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Trash2, Edit2, Check, X, Sparkles, Shirt } from 'lucide-react';
import { toast } from 'sonner';

interface SavedOutfit {
  id: string;
  name: string;
  items: string[];
  preview_url: string | null;
  brand_names: string[] | null;
  product_links: unknown;
  created_at: string;
}

const SavedOutfits = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAvatar, avatarUrl } = useAvatar();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchOutfits();
  }, [user]);

  const fetchOutfits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_outfits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching outfits:', error);
      toast.error('Failed to load outfits');
    } else {
      setOutfits(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('saved_outfits').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete outfit');
    } else {
      setOutfits(outfits.filter((o) => o.id !== id));
      toast.success('Outfit deleted');
    }
    setDeletingId(null);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from('saved_outfits')
      .update({ name: editName.trim() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to rename');
    } else {
      setOutfits(outfits.map((o) => (o.id === id ? { ...o, name: editName.trim() } : o)));
      toast.success('Renamed!');
    }
    setEditingId(null);
  };

  const handleReTryOn = (outfit: SavedOutfit) => {
    if (!hasAvatar || !avatarUrl) {
      toast.error('Create an avatar first');
      return;
    }
    // If we have a cached preview, just navigate to studio with it
    if (outfit.preview_url) {
      navigate('/', { state: { savedOutfitPreview: outfit.preview_url, outfitName: outfit.name } });
    } else {
      toast.info('No preview cached — navigate to wardrobe to re-try');
      navigate('/wardrobe');
    }
  };

  if (authLoading || loading) {
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
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative pt-20 pb-24 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">Saved Outfits</h1>
            <p className="text-muted-foreground text-sm">{outfits.length} outfit{outfits.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {outfits.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Shirt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No saved outfits yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Try on clothes and save your favourite looks
              </p>
              <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-primary to-secondary">
                Go to Try-On Studio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {outfits.map((outfit) => (
              <Card key={outfit.id} className="glass-card border-0 overflow-hidden">
                <CardContent className="p-0">
                  {/* Preview image */}
                  <div
                    className="aspect-[3/4] bg-muted cursor-pointer relative group"
                    onClick={() => handleReTryOn(outfit)}
                  >
                    {outfit.preview_url ? (
                      <img
                        src={outfit.preview_url}
                        alt={outfit.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Re-try overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    {editingId === outfit.id ? (
                      <div className="flex gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          maxLength={50}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(outfit.id)}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleRename(outfit.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-medium truncate">{outfit.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(outfit.created_at).toLocaleDateString()}
                        </p>
                        {outfit.brand_names && outfit.brand_names.length > 0 && (
                          <p className="text-[10px] text-primary truncate mt-0.5">
                            {outfit.brand_names.join(', ')}
                          </p>
                        )}
                      </>
                    )}

                    {editingId !== outfit.id && (
                      <div className="flex gap-1 mt-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => { setEditingId(outfit.id); setEditName(outfit.name); }}
                        >
                          <Edit2 className="w-3 h-3 mr-0.5" /> Rename
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive"
                          onClick={() => handleDelete(outfit.id)}
                          disabled={deletingId === outfit.id}
                        >
                          {deletingId === outfit.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <><Trash2 className="w-3 h-3 mr-0.5" /> Delete</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default SavedOutfits;
