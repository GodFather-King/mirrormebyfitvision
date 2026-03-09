import { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Play, User, Camera, Shirt, Save, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const TUTORIAL_SEEN_KEY = 'mirrorme_tutorial_seen';

const tutorialSteps = [
  {
    icon: Play,
    title: 'Welcome to MirrorMe',
    caption: 'Your virtual fitting room',
    description: 'Try on clothes digitally before you buy. Let us show you how it works!',
    video: '/videos/mirrorme-tutorial.mp4',
  },
  {
    icon: User,
    title: 'Create Your Avatar',
    caption: 'Create your digital avatar',
    description: 'Upload a full-body photo and our AI builds a realistic digital twin that matches your body shape and proportions.',
    video: '/videos/tutorial-step-avatar.mp4',
  },
  {
    icon: Camera,
    title: 'Upload Clothing',
    caption: 'Scan clothing in stores',
    description: 'Take a photo of any clothing item or browse our partner brands to add clothes you want to try on.',
    video: '/videos/tutorial-step-scan.mp4',
  },
  {
    icon: Shirt,
    title: 'Virtual Try-On',
    caption: 'Try outfits instantly',
    description: 'See how any outfit looks on your avatar from front, side, and back views — all powered by AI.',
    video: '/videos/tutorial-step-tryon.mp4',
  },
  {
    icon: Save,
    title: 'Save Your Looks',
    caption: 'Save looks to your wardrobe',
    description: 'Love an outfit? Save it to your wardrobe for later. Build your dream closet without buying first.',
    video: '/videos/tutorial-step-wardrobe.mp4',
  },
  {
    icon: Navigation,
    title: 'Navigate With Ease',
    caption: 'Use the bottom menu to explore',
    description: 'Use the bottom navigation bar to jump between Home, Shop, Brands, Wardrobe, and your Profile.',
    video: '/videos/tutorial-step-navigate.mp4',
  },
];

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorialModal = ({ open, onOpenChange }: TutorialModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    onOpenChange(false);
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    onOpenChange(false);
  };

  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl overflow-hidden border-border/50 bg-background">
        {/* Close / Skip */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip tutorial
          </button>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-2">
          <Progress value={progress} className="h-1" />
          <p className="text-[10px] text-muted-foreground text-right mt-1">
            {currentStep + 1} / {tutorialSteps.length}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 pt-4 text-center space-y-4">
          {/* Video or Icon visual */}
          {step.showVideo ? (
            <div className="rounded-xl overflow-hidden bg-muted/30 aspect-[9/14] max-h-[280px] mx-auto">
              <video
                ref={videoRef}
                src="/videos/mirrorme-tutorial.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-scale-in">
                <Icon className="w-10 h-10 text-primary" />
              </div>
            </div>
          )}

          {/* Caption badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {step.caption}
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-foreground">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {step.description}
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="px-6 pb-6 pt-4 flex items-center gap-3">
          {currentStep > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            variant="glow"
            size="sm"
            onClick={handleNext}
            className="flex-1"
          >
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {tutorialSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'bg-primary w-5'
                  : i < currentStep
                  ? 'bg-primary/40'
                  : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { TutorialModal, TUTORIAL_SEEN_KEY };
