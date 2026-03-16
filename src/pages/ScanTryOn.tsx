import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForEdgeFunction } from '@/lib/imageUtils';
import { useTryOnWithRetry } from '@/hooks/useTryOnWithRetry';
import { useTryOnUsage } from '@/hooks/useTryOnUsage';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera, X, RotateCw, Crop, Loader2, ArrowLeft, Shirt,
  Save, Eye, Layers, Replace, ZoomIn, ZoomOut, Move, Check, Sparkles, ScanLine, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import LimitReachedModal from '@/components/LimitReachedModal';

type ScanStep = 'camera' | 'preview' | 'detecting' | 'detected' | 'trying-on' | 'result';

interface DetectedClothing {
  type: string;
  color: string;
  pattern: string;
  processedImageUrl: string;
}

const CATEGORY_MAP: Record<string, string> = {
  top: 'tops',
  shirt: 'tops',
  blouse: 'tops',
  't-shirt': 'tops',
  tshirt: 'tops',
  sweater: 'tops',
  hoodie: 'tops',
  pants: 'bottoms',
  trousers: 'bottoms',
  jeans: 'bottoms',
  shorts: 'bottoms',
  skirt: 'bottoms',
  dress: 'dresses',
  gown: 'dresses',
  jacket: 'outerwear',
  coat: 'outerwear',
  blazer: 'outerwear',
  vest: 'outerwear',
  shoe: 'shoes',
  sneaker: 'shoes',
  boot: 'shoes',
  sandal: 'shoes',
  hat: 'accessories',
  bag: 'accessories',
  scarf: 'accessories',
  belt: 'accessories',
};

function mapToCategory(type: string): string {
  const lower = type.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'tops';
}

const ScanTryOn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { avatarUrl, hasAvatar, measurements } = useAvatar();
  const { remaining, isFreePlan, isAtLimit, isAtScanLimit, recordUsage, recordScanUsage, FREE_DAILY_LIMIT, FREE_SCAN_LIMIT, dailyCount, scanRemaining, scanCount } = useTryOnUsage();
  const { invoke: tryOnInvoke, cancel: cancelTryOn } = useTryOnWithRetry();

  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedClothing | null>(null);
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(null);
  const [tryOnMode, setTryOnMode] = useState<'single' | 'overlay'>('single');
  const [isSaving, setIsSaving] = useState(false);
  const [bottomNavTab, setBottomNavTab] = useState('home');
  const [itemName, setItemName] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<'try-on' | 'scan'>('try-on');

  // Crop/edit state
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState([100]);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1920 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      toast.error('Camera access denied. You can upload a photo instead.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [step]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep('preview');
  }, [stopCamera]);

  // Handle file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedImage(dataUrl);
      stopCamera();
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  // Apply crop/edit transforms and return final image
  const getEditedImage = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!capturedImage) { resolve(''); return; }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const s = scale[0] / 100;
        const maxDim = 768;
        let w = img.width * s;
        let h = img.height * s;
        if (Math.max(w, h) > maxDim) {
          const ratio = maxDim / Math.max(w, h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        // Handle rotation
        const rad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        canvas.width = Math.round(w * cos + h * sin);
        canvas.height = Math.round(w * sin + h * cos);

        const ctx = canvas.getContext('2d')!;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = capturedImage;
    });
  }, [capturedImage, rotation, scale]);

  // Detect clothing via AI
  const detectClothing = useCallback(async () => {
    if (!capturedImage) return;
    if (isAtScanLimit) {
      setLimitModalType('scan');
      setShowLimitModal(true);
      return;
    }
    setStep('detecting');

    try {
      const editedImage = await getEditedImage();
      const prepared = await prepareImageForEdgeFunction(editedImage);

      const { data, error } = await supabase.functions.invoke('process-clothing', {
        body: { imageUrl: prepared, category: 'auto', name: 'Scanned Item' }
      });

      if (error) throw error;

      const processedUrl = data?.processedImageUrl || prepared;

      setDetected({
        type: 'clothing',
        color: 'detected',
        pattern: 'detected',
        processedImageUrl: processedUrl,
      });
      setItemName('Scanned Clothing');
      await recordScanUsage('scan');
      setStep('detected');
      if (isFreePlan) {
        const left = FREE_SCAN_LIMIT - (scanCount + 1);
        toast.success(left > 0 ? `Clothing detected! ${left} scan${left === 1 ? '' : 's'} left today` : 'Clothing detected! No free scans left today.');
      } else {
        toast.success('Clothing detected and isolated!');
      }
    } catch (err: any) {
      console.error('Detection error:', err);
      if (err?.message?.includes('429')) {
        toast.error('Rate limit hit. Please wait a moment.');
      } else if (err?.message?.includes('402')) {
        toast.error('AI credits needed.');
      } else {
        toast.error('Could not detect clothing. Try a clearer photo.');
      }
      setStep('preview');
    }
  }, [capturedImage, getEditedImage, isAtScanLimit, isFreePlan, scanCount]);

  // Try on the detected clothing
  const handleTryOn = useCallback(async () => {
    if (!detected || !hasAvatar || !avatarUrl) {
      toast.error('You need an avatar first. Create one in the Try-On Studio.');
      return;
    }
    if (isAtLimit) {
      toast.error("You've used your 5 free try-ons today. Come back tomorrow or upgrade!", { duration: 6000 });
      return;
    }

    setStep('trying-on');

    try {
      const body: Record<string, any> = {
        avatarUrl,
        clothingName: itemName || 'Scanned Clothing',
        clothingType: mapToCategory(detected.type),
        clothingImageUrl: detected.processedImageUrl,
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
        await recordUsage('scan-try-on');
        setStep('result');
        if (isFreePlan) {
          const left = FREE_DAILY_LIMIT - (dailyCount + 1);
          toast.success(left > 0 ? `Applied! ${left} try-on${left === 1 ? '' : 's'} left today` : 'Applied! No free try-ons left today.');
        } else {
          toast.success('Clothing applied to your avatar!');
        }
      }
    } catch (err: any) {
      console.error('Scan try-on error:', err);
      if (err?.message?.includes('timed out')) {
        toast.error('Try-on timed out. Try a simpler image.');
      } else {
        toast.error('Could not apply clothing.');
      }
      setStep('detected');
    }
  }, [detected, hasAvatar, avatarUrl, measurements, itemName, isAtLimit, isFreePlan, dailyCount]);

  // Save to wardrobe
  const handleSaveToWardrobe = useCallback(async () => {
    if (!user || !detected) return;
    setIsSaving(true);

    try {
      const category = mapToCategory(detected.type) as "tops" | "bottoms" | "dresses" | "outerwear" | "shoes" | "accessories";
      const { error } = await supabase.from('wardrobe_items').insert([{
        user_id: user.id,
        name: itemName || 'Scanned Item',
        category,
        original_image_url: capturedImage!,
        processed_image_url: detected.processedImageUrl,
        color: detected.color !== 'detected' ? detected.color : null,
      }]);

      if (error) throw error;
      toast.success('Saved to wardrobe!');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save to wardrobe.');
    } finally {
      setIsSaving(false);
    }
  }, [user, detected, capturedImage, itemName]);

  // Reset
  const resetScan = () => {
    setCapturedImage(null);
    setDetected(null);
    setTryOnUrl(null);
    setRotation(0);
    setScale([100]);
    setItemName('');
    setStep('camera');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
      </div>

      <Header />

      <main className="relative pt-20 pb-24 px-4 max-w-lg md:max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Studio
        </Button>

        <h1 className="font-display font-bold text-xl mb-4">
          <span className="gradient-text">Scan</span>
          <span className="text-foreground"> & Try On</span>
        </h1>

        {/* ===== STEP: CAMERA ===== */}
        {step === 'camera' && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-dashed border-primary/50 rounded-xl" />
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                    <ScanLine className="w-3 h-3 mr-1 animate-pulse" />
                    Point at a clothing item
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={capturePhoto}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 text-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </Button>
              <Button
                variant="outline"
                className="h-14 px-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {!hasAvatar && (
              <div className="glass-card p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  You need an avatar to try on scanned clothing
                </p>
                <Button size="sm" onClick={() => navigate('/')}>
                  Create Avatar First
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP: PREVIEW / EDIT ===== */}
        {step === 'preview' && capturedImage && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured clothing"
                className="max-w-full max-h-full object-contain transition-transform"
                style={{
                  transform: `rotate(${rotation}deg) scale(${scale[0] / 100})`,
                }}
              />
            </div>

            {/* Edit tools */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Crop className="w-4 h-4 text-primary" />
                Adjust Image
              </h3>

              <div className="flex items-center gap-3">
                <Label className="text-xs w-14 shrink-0">Rotate</Label>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">{rotation}°</span>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs w-14 shrink-0">Size</Label>
                <ZoomOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Slider
                  value={scale}
                  onValueChange={setScale}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetScan}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Retake
              </Button>
              <Button
                onClick={detectClothing}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Detect Clothing
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP: DETECTING ===== */}
        {step === 'detecting' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <Loader2 className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-spin" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Analyzing Clothing</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Detecting clothing type, removing background, and isolating the garment...
            </p>
          </div>
        )}

        {/* ===== STEP: DETECTED ===== */}
        {step === 'detected' && detected && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-sm">Clothing Detected</h3>
              </div>

              <div className="rounded-xl overflow-hidden bg-muted aspect-square mb-3">
                <img
                  src={detected.processedImageUrl}
                  alt="Detected clothing"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Name input */}
              <div className="space-y-2">
                <Label className="text-xs">Item Name</Label>
                <Input
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Blue Denim Jacket"
                  className="bg-muted/30"
                />
              </div>
            </div>

            {/* Try-on mode selection */}
            <div className="glass-card p-4">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Try-On Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tryOnMode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTryOnMode('single')}
                  className="flex items-center gap-1.5"
                >
                  <Replace className="w-3.5 h-3.5" />
                  Single
                </Button>
                <Button
                  variant={tryOnMode === 'overlay' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTryOnMode('overlay')}
                  className="flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Overlay
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {tryOnMode === 'single'
                  ? 'Replace current clothing on your avatar'
                  : 'Layer this item with your current outfit'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setDetected(null); setStep('preview'); }}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Re-edit
              </Button>
              <Button
                onClick={handleTryOn}
                disabled={!hasAvatar}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Shirt className="w-4 h-4 mr-1" />
                Try On
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleSaveToWardrobe}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save to Wardrobe
            </Button>
          </div>
        )}

        {/* ===== STEP: TRYING ON ===== */}
        {step === 'trying-on' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Shirt className="w-10 h-10 text-primary" />
              </div>
              <Loader2 className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-spin" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Applying to Avatar</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Fitting the clothing to your body shape and proportions...
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground"
              onClick={() => { cancelTryOn(); setStep('detected'); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* ===== STEP: RESULT ===== */}
        {step === 'result' && tryOnUrl && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl overflow-hidden bg-muted aspect-[3/4]">
              <img
                src={tryOnUrl}
                alt="Try-on result"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="glass-card p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm">{itemName || 'Scanned clothing'} applied to your avatar</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={resetScan}>
                <Camera className="w-4 h-4 mr-1" />
                Scan Another
              </Button>
              <Button
                onClick={handleSaveToWardrobe}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save to Wardrobe
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Back to Studio
            </Button>
          </div>
        )}

        {/* Free plan nudge */}
        {isFreePlan && hasAvatar && (
          <div className={`glass-card p-3 mt-4 space-y-2`}>
            <div className={`flex items-center justify-between ${isAtLimit ? 'text-destructive' : ''}`}>
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 shrink-0 ${isAtLimit ? 'text-destructive' : 'text-primary'}`} />
                <span className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${remaining}/${FREE_DAILY_LIMIT} free try-ons left` : 'Try-ons used up today'}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={() => navigate('/pricing')}>
                Upgrade
              </Button>
            </div>
            <div className={`flex items-center justify-between ${isAtScanLimit ? 'text-destructive' : ''}`}>
              <div className="flex items-center gap-2">
                <ScanLine className={`w-4 h-4 shrink-0 ${isAtScanLimit ? 'text-destructive' : 'text-primary'}`} />
                <span className="text-xs text-muted-foreground">
                  {scanRemaining > 0 ? `${scanRemaining}/${FREE_SCAN_LIMIT} free scans left` : 'Scans used up today'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation activeTab={bottomNavTab} onTabChange={setBottomNavTab} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScanTryOn;
