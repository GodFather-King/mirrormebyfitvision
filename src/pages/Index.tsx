import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AvatarViewer from '@/components/AvatarViewer';
import MeasurementsCard from '@/components/MeasurementsCard';
import ClothingCarousel from '@/components/ClothingCarousel';
import PhotoUploader from '@/components/PhotoUploader';

const measurements = [
  { label: 'Height', value: '175', unit: 'cm' },
  { label: 'Chest', value: '96', unit: 'cm' },
  { label: 'Waist', value: '82', unit: 'cm' },
  { label: 'Hips', value: '98', unit: 'cm' },
  { label: 'Shoulders', value: '44', unit: 'cm' },
  { label: 'Inseam', value: '81', unit: 'cm' },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedClothing, setSelectedClothing] = useState<any>(null);

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Radial gradient background effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
      </div>

      <Header />
      
      <main className="relative pt-20 pb-24 px-4 max-w-md mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="font-display font-bold text-2xl">Your Virtual Fitting Room</h1>
        </div>

        {/* Photo Upload / Avatar View */}
        {!hasPhoto && !scanComplete ? (
          <div className="animate-fade-in-delay-1">
            <PhotoUploader 
              onUpload={setHasPhoto} 
              onStartScan={handleStartScan}
            />
          </div>
        ) : (
          <div className="animate-fade-in-delay-1">
            <AvatarViewer 
              isScanning={isScanning} 
              hasClothing={!!selectedClothing}
              selectedClothing={selectedClothing?.id}
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
              onSelect={setSelectedClothing}
              selectedId={selectedClothing?.id || null}
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
