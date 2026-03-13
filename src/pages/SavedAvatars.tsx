import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trash2, User, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_AVATARS = 2;

interface SavedAvatar {
  id: string;
  name: string;
  front_view_url: string | null;
  side_view_url: string | null;
  back_view_url: string | null;
  measurements: unknown;
  created_at: string;
}

const SavedAvatars = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { avatar: activeAvatar, switchAvatar, refreshAvatar } = useAvatar();
  const [avatars, setAvatars] = useState<SavedAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('saved');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAvatars();
    }
  }, [user]);

  const fetchAvatars = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_avatars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching avatars:', error);
      toast.error('Failed to load saved avatars');
    } else {
      setAvatars(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from('saved_avatars')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting avatar:', error);
      toast.error('Failed to delete avatar');
    } else {
      setAvatars(avatars.filter(a => a.id !== id));
      toast.success('Avatar deleted');
      // Refresh the avatar context to update active avatar if needed
      refreshAvatar();
    }
    setDeletingId(null);
  };

  const handleSetActive = async (id: string) => {
    switchAvatar(id);
    toast.success('Avatar set as active');
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
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative pt-20 pb-24 px-4 max-w-md md:max-w-6xl mx-auto">
        {/* Back button and title */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">Saved Avatars</h1>
            <p className="text-muted-foreground text-sm">{avatars.length} of {MAX_AVATARS} slots used</p>
          </div>
        </div>

        {/* Create new avatar button */}
        {avatars.length < MAX_AVATARS && (
          <Card 
            className="glass-card border-0 overflow-hidden mb-4 cursor-pointer hover:bg-muted/50 transition-colors border-2 border-dashed border-primary/30"
            onClick={() => navigate('/')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Create New Avatar</h3>
                <p className="text-muted-foreground text-xs">
                  {MAX_AVATARS - avatars.length} slot{MAX_AVATARS - avatars.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {avatars.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No saved avatars yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first 3D avatar and save it here
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Create Avatar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {avatars.map((avatar) => (
              <Card 
                key={avatar.id} 
                className={cn(
                  "glass-card border-0 overflow-hidden transition-all",
                  activeAvatar?.id === avatar.id && "ring-2 ring-primary"
                )}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Avatar preview */}
                    <div className="w-24 h-24 bg-muted shrink-0 relative">
                      {avatar.front_view_url ? (
                        <img
                          src={avatar.front_view_url}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {activeAvatar?.id === avatar.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{avatar.name}</h3>
                          {activeAvatar?.id === avatar.id && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {new Date(avatar.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        {activeAvatar?.id !== avatar.id && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSetActive(avatar.id)}
                            className="text-xs h-7 bg-gradient-to-r from-primary to-secondary"
                          >
                            Use This
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/?avatar=${avatar.id}`)}
                          className="text-xs h-7"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(avatar.id)}
                          disabled={deletingId === avatar.id}
                          className="text-destructive hover:text-destructive h-7 px-2"
                        >
                          {deletingId === avatar.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info about avatar limit */}
        {avatars.length >= MAX_AVATARS && (
          <p className="text-center text-muted-foreground text-xs mt-4">
            You've reached the maximum of {MAX_AVATARS} avatars. Delete one to create a new avatar.
          </p>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default SavedAvatars;
