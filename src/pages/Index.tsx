import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AvatarViewer from '@/components/AvatarViewer';
import MeasurementsCard from '@/components/MeasurementsCard';
import AvatarEditPanel from '@/components/AvatarEditPanel';

import PhotoUploader from '@/components/PhotoUploader';
import HeroLanding from '@/components/HeroLanding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
 import { Sparkles, Shield, Zap, Save, Loader2, X, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { trackEvent } from '@/hooks/usePageTracking';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar, defaultMeasurements as defaultAvatarMeasurements, type AvatarMeasurements } from '@/hooks/useAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const features = [
  { icon: Sparkles, label: 'AI-Powered', desc: '99% Accuracy' },
  { icon: Shield, label: 'Secure', desc: 'End-to-End Encrypted' },
  { icon: Zap, label: 'Instant', desc: '3-Second Scan' },
];

type AvatarViews = {
  front: string | null;
  side: string | null;
  back: string | null;
};

type LoadingViews = {
  front: boolean;
  side: boolean;
  back: boolean;
};

interface WardrobeItemData {
  id: string;
  name: string;
  category: string;
  original_image_url: string;
  processed_image_url: string | null;
  color: string | null;
}

const RETURNING_USER_KEY = 'mirrorme_returning_user';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    avatarUrl: contextAvatarUrl, 
    measurements: contextMeasurements, 
    hasAvatar, 
    updateAvatarFromGeneration,
    isLoading: avatarLoading,
    canCreateNewAvatar,
    avatars,
    maxAvatars,
    refreshAvatar
  } = useAvatar();
  
  const [activeTab, setActiveTab] = useState('home');
  const [showHero, setShowHero] = useState(() => {
    // Check if user has visited before
    return !localStorage.getItem(RETURNING_USER_KEY);
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  // Local avatarImage and avatarViews are for the CURRENT generation session only.
  // If we already have a persisted avatar from context, we initialise from it.
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarViews, setAvatarViews] = useState<AvatarViews>({ front: null, side: null, back: null });
  const [isLoadingViews, setIsLoadingViews] = useState<LoadingViews>({ front: false, side: false, back: false });
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isApplyingClothing, setIsApplyingClothing] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedClothing, setSelectedClothing] = useState<any>(null);
  const [avatarMeasurements, setAvatarMeasurements] = useState<AvatarMeasurements>(defaultAvatarMeasurements);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItemData[]>([]);
  const [showAvatarLimitDialog, setShowAvatarLimitDialog] = useState(false);

  // Restore avatar from global context on mount (only once)
  const hasInitFromContext = useRef(false);

  useEffect(() => {
    // Guard: only initialise once AND only after avatar loading is finished
    if (hasInitFromContext.current) return;
    if (avatarLoading) return;
    if (!hasAvatar) return; // nothing to restore

    hasInitFromContext.current = true;

    // Populate local state from global context so we don't start blank
    if (contextAvatarUrl && !avatarImage) {
      setAvatarImage(contextAvatarUrl);
      setAvatarViews((prev) => ({ ...prev, front: contextAvatarUrl }));
      setScanComplete(true);
      setShowHero(false);
    }
    if (contextMeasurements) {
      setAvatarMeasurements(contextMeasurements);
    }
  }, [avatarLoading, hasAvatar, contextAvatarUrl, contextMeasurements, avatarImage]);

  // Handle wardrobe items passed from Wardrobe page - skip hero if we have items
  useEffect(() => {
    const state = location.state as { wardrobeItems?: WardrobeItemData[], savedAvatarUrl?: string } | null;
    if (state?.wardrobeItems && state.wardrobeItems.length > 0) {
      setWardrobeItems(state.wardrobeItems);
      setShowHero(false); // Skip hero when coming from wardrobe
      
      // If we have a saved avatar URL, use it directly
      if (state.savedAvatarUrl) {
        setAvatarImage(state.savedAvatarUrl);
        setAvatarViews(prev => ({ ...prev, front: state.savedAvatarUrl! }));
        setScanComplete(true);
      }
      
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Mark user as returning when they dismiss the hero
  const handleGetStarted = () => {
    localStorage.setItem(RETURNING_USER_KEY, 'true');
    setShowHero(false);
  };

  // Auto try-on wardrobe items when avatar becomes available
  useEffect(() => {
    if (wardrobeItems.length > 0 && scanComplete && (avatarImage || uploadedPhoto) && !tryOnImage && !isApplyingClothing) {
      handleWardrobeTryOn(wardrobeItems);
    }
  }, [scanComplete, avatarImage, wardrobeItems]);

  // Try on wardrobe items
  const handleWardrobeTryOn = async (items: WardrobeItemData[]) => {
    const baseImage = avatarImage || uploadedPhoto;
    if (!baseImage || items.length === 0) return;

    setIsApplyingClothing(true);
    setSelectedClothing(null);

    try {
      const clothingItems = items.map(item => ({
        name: item.name,
        category: item.category,
        color: item.color,
        originalImageUrl: item.original_image_url,
        processedImageUrl: item.processed_image_url
      }));

      const { data, error } = await supabase.functions.invoke('wardrobe-try-on', {
        body: { avatarUrl: baseImage, clothingItems }
      });

      if (error) {
        console.error('Wardrobe try-on error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits needed. Please add funds.');
        } else {
          toast.error('Could not apply wardrobe items.');
        }
      } else if (data?.tryOnUrl) {
        setTryOnImage(data.tryOnUrl);
        toast.success(`${items.length} item${items.length > 1 ? 's' : ''} applied!`);
      }
    } catch (err) {
      console.error('Wardrobe try-on failed:', err);
      toast.error('Failed to apply wardrobe items.');
    } finally {
      setIsApplyingClothing(false);
    }
  };

  const clearWardrobeItems = () => {
    setWardrobeItems([]);
    setTryOnImage(null);
  };

  // Generate a specific view of the avatar
  const generateView = useCallback(async (view: 'front' | 'side' | 'back', sourceImage: string) => {
    if (avatarViews[view]) return; // Already generated
    
    setIsLoadingViews(prev => ({ ...prev, [view]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-views', {
        body: { imageUrl: sourceImage, view }
      });

      if (error) {
        console.error(`Error generating ${view} view:`, error);
        toast.error(`Could not generate ${view} view`);
      } else if (data?.viewUrl) {
        setAvatarViews(prev => ({ ...prev, [view]: data.viewUrl }));
        console.log(`${view} view generated successfully`);
      }
    } catch (err) {
      console.error(`Failed to generate ${view} view:`, err);
    } finally {
      setIsLoadingViews(prev => ({ ...prev, [view]: false }));
    }
  }, [avatarViews]);

  // Handle view change - generate view on demand
  const handleViewChange = useCallback((view: 'front' | 'side' | 'back') => {
    const sourceImage = avatarImage || uploadedPhoto;
    if (sourceImage && !avatarViews[view]) {
      generateView(view, sourceImage);
    }
  }, [avatarImage, uploadedPhoto, avatarViews, generateView]);

  const handleStartScan = async () => {
    if (!uploadedPhoto) return;
    
    setIsScanning(true);
    
    // Reset previous state
    setAvatarViews({ front: null, side: null, back: null });
    setTryOnImage(null);
    setSelectedClothing(null);
    
    // Simulate initial body analysis
    setTimeout(async () => {
      setIsScanning(false);
      setIsGeneratingAvatar(true);
      
      try {
        // Call the AI to generate a 3D avatar (front view first)
        const { data, error } = await supabase.functions.invoke('generate-avatar', {
          body: { imageUrl: uploadedPhoto }
        });

        if (error) {
          console.error('Avatar generation error:', error);
          
          if (error.message?.includes('429')) {
            toast.error('Rate limit exceeded. Please wait a moment and try again.');
          } else if (error.message?.includes('402')) {
            toast.error('AI credits needed. Please add funds to continue.');
          } else {
            toast.error('Failed to generate avatar. Using enhanced photo instead.');
          }
          
          setAvatarImage(null);
        } else if (data?.avatarUrl) {
          console.log('Avatar generated successfully');
          setAvatarImage(data.avatarUrl);
          setAvatarViews(prev => ({ ...prev, front: data.avatarUrl }));
          
          // Update measurements from AI analysis
          const newMeasurements: AvatarMeasurements = {
            height_cm: data.measurements?.height_cm || 170,
            chest_cm: data.measurements?.chest_cm || 92,
            waist_cm: data.measurements?.waist_cm || 82,
            hips_cm: data.measurements?.hips_cm || 98,
            shoulders_cm: data.measurements?.shoulders_cm || 44,
            inseam_cm: data.measurements?.inseam_cm || 81,
            body_type: data.measurements?.body_type || 'average',
          };
          setAvatarMeasurements(newMeasurements);

          // Use the avatar context to handle persistence (localStorage + DB)
          await updateAvatarFromGeneration(data.avatarUrl, newMeasurements, true);
          trackEvent('avatar_created', { source: 'home' });
          toast.success('3D Avatar created with body measurements!');
        } else {
          console.error('No avatar URL in response:', data);
          toast.error('Avatar generation incomplete. Using enhanced photo.');
          setAvatarImage(null);
        }
      } catch (err) {
        console.error('Avatar generation failed:', err);
        toast.error('Failed to connect to AI service.');
        setAvatarImage(null);
      } finally {
        setIsGeneratingAvatar(false);
        setScanComplete(true);
      }
    }, 2000);
  };

  const handleClothingSelect = async (item: any) => {
    // If deselecting, reset to base avatar
    if (!item || selectedClothing?.id === item.id) {
      setSelectedClothing(null);
      setTryOnImage(null);
      return;
    }

    setSelectedClothing(item);
    
    // Only apply clothing if we have an avatar
    const baseImage = avatarImage || uploadedPhoto;
    if (!baseImage) return;

    setIsApplyingClothing(true);

    try {
      // Convert relative/local URLs to base64 for AI gateway (it can't access preview server)
      const preparedImageUrl = await prepareImageForEdgeFunction(item.image);

      const { data, error } = await supabase.functions.invoke('try-on-clothing', {
        body: { 
          avatarUrl: baseImage,
          clothingName: item.name,
          clothingType: item.type,
          clothingImageUrl: preparedImageUrl
        }
      });

      if (error) {
        console.error('Try-on error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits needed. Please add funds.');
        } else {
          toast.error('Could not apply clothing. Try again.');
        }
      } else if (data?.tryOnUrl) {
        console.log('Clothing applied successfully');
        setTryOnImage(data.tryOnUrl);
        toast.success(`${item.name} applied!`);
      } else {
        toast.error('Could not visualize this item.');
      }
    } catch (err) {
      console.error('Try-on failed:', err);
      toast.error('Failed to apply clothing.');
    } finally {
      setIsApplyingClothing(false);
    }
  };

  // Save avatar to database
  const handleSaveAvatar = async () => {
    if (!user) {
      toast.error('Please sign in to save your avatar');
      navigate('/auth');
      return;
    }

    if (!avatarViews.front && !avatarImage) {
      toast.error('No avatar to save');
      return;
    }

    // Check if user already has max avatars
    if (!canCreateNewAvatar) {
      setShowAvatarLimitDialog(true);
      return;
    }

    setIsSavingAvatar(true);

    try {
      const { error } = await supabase
        .from('saved_avatars')
        .insert([{
          user_id: user.id,
          name: `Avatar ${new Date().toLocaleDateString()}`,
          front_view_url: avatarViews.front || avatarImage,
          side_view_url: avatarViews.side,
          back_view_url: avatarViews.back,
          measurements: JSON.parse(JSON.stringify(avatarMeasurements))
        }]);

      if (error) {
        console.error('Error saving avatar:', error);
        toast.error('Failed to save avatar');
      } else {
        toast.success('Avatar saved successfully!');
        refreshAvatar(); // Refresh to update avatars list
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Determine which image to show - prioritize try-on, then avatar views, then base avatar
  const getDisplayAvatarImage = () => {
    if (tryOnImage) return tryOnImage;
    return avatarImage;
  };

  // Show hero landing for first-time experience
  if (showHero && !uploadedPhoto && !scanComplete && wardrobeItems.length === 0) {
    return <HeroLanding onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Multi-layer background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <Header />
      
      <main className="relative pt-20 pb-24 px-4 max-w-md md:max-w-6xl mx-auto space-y-6">
        {/* Welcome Section with enhanced styling */}
        <div className="animate-fade-in">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI System Online
          </p>
          <h1 className="font-display font-bold text-2xl mt-1">
            <span className="gradient-text">3D Body Scan</span>
            <span className="text-foreground"> & Virtual Try-On</span>
          </h1>
        </div>

        {/* Sign In CTA for non-authenticated users */}
        {!user && !scanComplete && (
          <div className="animate-fade-in glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-lg mb-2">Welcome to MirrorMe</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Sign in to save your avatar, measurements, and try on clothes from partner brands
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In / Create Account
            </Button>
          </div>
        )}

        {/* Feature pills */}
        {!scanComplete && (
          <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in-delay-1 scrollbar-hide">
            {features.map((feature, i) => (
              <div 
                key={feature.label}
                className="flex-shrink-0 glass-card px-3 py-2 flex items-center gap-2"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <feature.icon className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">{feature.label}</p>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Upload / Avatar View */}
        {!uploadedPhoto && !scanComplete ? (
          <div className="animate-fade-in-delay-2">
            <PhotoUploader 
              onUpload={setUploadedPhoto} 
              onStartScan={handleStartScan}
            />
          </div>
        ) : (
          <div className="animate-fade-in-delay-1">
            <AvatarViewer 
              isScanning={isScanning} 
              isGeneratingAvatar={isGeneratingAvatar}
              hasClothing={!!selectedClothing}
              selectedClothing={selectedClothing?.id}
              userPhoto={uploadedPhoto}
              avatarImage={tryOnImage || avatarImage}
              avatarViews={tryOnImage ? undefined : avatarViews}
              isLoadingViews={isLoadingViews}
              onViewChange={handleViewChange}
            />
          </div>
        )}

        {/* Wardrobe Items Being Tried On */}
        {wardrobeItems.length > 0 && (
          <div className="animate-fade-in-delay-2 glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Trying On From Wardrobe</h3>
              <Button variant="ghost" size="sm" onClick={clearWardrobeItems}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {wardrobeItems.map(item => (
                <Badge key={item.id} variant="secondary" className="px-2 py-1">
                  {item.name}
                </Badge>
              ))}
            </div>
            {!scanComplete && (
              <p className="text-xs text-muted-foreground mt-2">
                Upload a photo and scan to try these on
              </p>
            )}
          </div>
        )}

        {/* Measurements */}
        {scanComplete && (
          <div className="animate-fade-in-delay-2">
            <MeasurementsCard 
              measurements={[
                { label: 'Height', value: String(avatarMeasurements.height_cm), unit: 'cm' },
                { label: 'Chest', value: String(avatarMeasurements.chest_cm), unit: 'cm' },
                { label: 'Waist', value: String(avatarMeasurements.waist_cm), unit: 'cm' },
                { label: 'Hips', value: String(avatarMeasurements.hips_cm), unit: 'cm' },
                { label: 'Shoulders', value: String(avatarMeasurements.shoulders_cm), unit: 'cm' },
                { label: 'Inseam', value: String(avatarMeasurements.inseam_cm), unit: 'cm' },
              ]} 
              accuracy={98}
            />
          </div>
        )}

        {/* Avatar Edit Panel */}
        {scanComplete && avatarImage && (
          <div className="animate-fade-in-delay-2">
            <AvatarEditPanel
              avatarUrl={avatarImage}
              measurements={avatarMeasurements}
              onAvatarUpdated={(newUrl, newMeasurements) => {
                setAvatarImage(newUrl);
                setAvatarViews(prev => ({ ...prev, front: newUrl }));
                setAvatarMeasurements(newMeasurements);
                updateAvatarFromGeneration(newUrl, newMeasurements, true);
              }}
            />
          </div>
        )}


        {/* Save Avatar Button */}
        {scanComplete && (
          <div className="animate-fade-in-delay-3">
            <Button
              onClick={handleSaveAvatar}
              disabled={isSavingAvatar}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isSavingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {user ? 'Save Avatar' : 'Sign In to Save'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Quick Actions when scan complete */}
        {scanComplete && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in-delay-3">
            <button className="glass-card p-4 text-left hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-xl">👕</span>
              </div>
              <p className="font-medium text-sm">Browse Styles</p>
              <p className="text-xs text-muted-foreground">500+ items</p>
            </button>
            <button className="glass-card p-4 text-left hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                <span className="text-xl">📏</span>
              </div>
              <p className="font-medium text-sm">Size Guide</p>
              <p className="text-xs text-muted-foreground">Find your fit</p>
            </button>
          </div>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Floating Add Avatar Button */}
      {user && scanComplete && canCreateNewAvatar && (
        <Button
          onClick={() => {
            // Reset state to allow new avatar creation
            setUploadedPhoto(null);
            setAvatarImage(null);
            setAvatarViews({ front: null, side: null, back: null });
            setTryOnImage(null);
            setSelectedClothing(null);
            setScanComplete(false);
            setAvatarMeasurements(defaultAvatarMeasurements);
          }}
          className="fixed bottom-24 right-4 z-40 rounded-full w-14 h-14 p-0 bg-primary hover:bg-primary/90 shadow-lg"
          title="Create another avatar"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Avatar Limit Dialog */}
      <AlertDialog open={showAvatarLimitDialog} onOpenChange={setShowAvatarLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avatar Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              You already have {maxAvatars} saved avatars (the maximum allowed). 
              To create a new avatar, please delete an existing one from your Saved Avatars.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/saved-avatars')}>
              Manage Avatars
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
