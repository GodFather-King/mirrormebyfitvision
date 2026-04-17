import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import WelcomeHero from '@/components/auth/WelcomeHero';
import AuthForms from '@/components/auth/AuthForms';

type OnboardingStep = 'welcome' | 'auth';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const transitionTo = (step: OnboardingStep) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentStep(step);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Step content with transitions */}
      <div className={`relative transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentStep === 'welcome' && (
          <WelcomeHero onContinue={() => transitionTo('auth')} />
        )}

        {currentStep === 'auth' && (
          <AuthForms 
            onBack={() => transitionTo('welcome')}
            signIn={signIn}
            signUp={signUp}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;
