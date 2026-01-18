import { useState } from 'react';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AvatarViewer from '@/components/AvatarViewer';
import MeasurementsCard from '@/components/MeasurementsCard';
import ClothingCarousel from '@/components/ClothingCarousel';
import PhotoUploader from '@/components/PhotoUploader';
import { Sparkles, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const measurements = [
  { label: 'Height', value: '175', unit: 'cm' },
  { label: 'Chest', value: '96', unit: 'cm' },
  { label: 'Waist', value: '82', unit: 'cm' },
  { label: 'Hips', value: '98', unit: 'cm' },
  { label: 'Shoulders', value: '44', unit: 'cm' },
  { label: 'Inseam', value: '81', unit: 'cm' },
];

const features = [
  { icon: Sparkles, label: 'AI-Powered', desc: '99% Accuracy' },
  { icon: Shield, label: 'Secure', desc: 'End-to-End Encrypted' },
  { icon: Zap, label: 'Instant', desc: '3-Second Scan' },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isApplyingClothing, setIsApplyingClothing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedClothing, setSelectedClothing] = useState<any>(null);

  const handleStartScan = async () => {
    if (!uploadedPhoto) return;
    
    setIsScanning(true);
    
    // Simulate initial body analysis
    setTimeout(async () => {
      setIsScanning(false);
      setIsGeneratingAvatar(true);
      
      try {
        // Call the AI to generate a 3D avatar
        const { data, error } = await supabase.functions.invoke('generate-avatar', {
          body: { imageUrl: uploadedPhoto }
        });

        if (error) {
          console.error('Avatar generation error:', error);
          
          // Handle specific error codes
          if (error.message?.includes('429')) {
            toast.error('Rate limit exceeded. Please wait a moment and try again.');
          } else if (error.message?.includes('402')) {
            toast.error('AI credits needed. Please add funds to continue.');
          } else {
            toast.error('Failed to generate avatar. Using enhanced photo instead.');
          }
          
          // Fallback to original photo with effects
          setAvatarImage(null);
        } else if (data?.avatarUrl) {
          console.log('Avatar generated successfully');
          setAvatarImage(data.avatarUrl);
          toast.success('3D Avatar created successfully!');
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
      const { data, error } = await supabase.functions.invoke('try-on-clothing', {
        body: { 
          avatarUrl: baseImage,
          clothingName: item.name,
          clothingType: item.type
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
      
      <main className="relative pt-20 pb-24 px-4 max-w-md mx-auto space-y-6">
        {/* Welcome Section with enhanced styling */}
        <div className="animate-fade-in">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI System Online
          </p>
          <h1 className="font-display font-bold text-2xl mt-1">
            <span className="gradient-text">3D Body Scan</span>
            <span className="text-foreground"> & Virtual Try-On</span>
          </h1>
        </div>

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
            />
          </div>
        )}

        {/* Measurements */}
        {scanComplete && (
          <div className="animate-fade-in-delay-2">
            <MeasurementsCard 
              measurements={measurements} 
              accuracy={98}
            />
          </div>
        )}

        {/* Clothing Selection */}
        {scanComplete && (
          <div className="animate-fade-in-delay-3">
            <ClothingCarousel 
              onSelect={handleClothingSelect}
              selectedId={selectedClothing?.id || null}
              isApplyingClothing={isApplyingClothing}
            />
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
    </div>
  );
};

export default Index;
