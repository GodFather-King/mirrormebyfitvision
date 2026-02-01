import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatar } from '@/hooks/useAvatar';
import { Button } from '@/components/ui/button';
import { Loader2, User, Sparkles } from 'lucide-react';

interface AvatarGuardProps {
  children: ReactNode;
  fallbackMessage?: string;
  showLoader?: boolean;
}

/**
 * Guard component that blocks rendering if no avatar exists.
 * Shows a prompt to create an avatar instead.
 */
const AvatarGuard = ({ 
  children, 
  fallbackMessage = 'Create an avatar to try on clothes',
  showLoader = true
}: AvatarGuardProps) => {
  const navigate = useNavigate();
  const { hasAvatar, isLoading } = useAvatar();

  // Show loader while checking avatar status
  if (isLoading && showLoader) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading your avatar...</p>
      </div>
    );
  }

  // If avatar exists, render children
  if (hasAvatar) {
    return <>{children}</>;
  }

  // No avatar - show creation prompt
  return (
    <div className="glass-card p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <User className="w-10 h-10 text-primary" />
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">Avatar Required</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
        {fallbackMessage}
      </p>
      <Button 
        onClick={() => navigate('/')}
        className="bg-gradient-to-r from-primary to-secondary"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Create My Avatar
      </Button>
    </div>
  );
};

export default AvatarGuard;
