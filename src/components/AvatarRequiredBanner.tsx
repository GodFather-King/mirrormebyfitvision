import { useNavigate } from 'react-router-dom';
import { useAvatar } from '@/hooks/useAvatar';
import { Button } from '@/components/ui/button';
import { Sparkles, User, AlertTriangle } from 'lucide-react';

interface AvatarRequiredBannerProps {
  className?: string;
}

/**
 * Soft-prompt banner that appears when the user has no avatar.
 * Encourages creation without blocking the rest of the page.
 */
const AvatarRequiredBanner = ({ className = '' }: AvatarRequiredBannerProps) => {
  const navigate = useNavigate();
  const { hasAvatar, isLoading } = useAvatar();

  // Don't show if loading or if avatar already exists
  if (isLoading || hasAvatar) return null;

  return (
    <div className={`glass-card p-4 flex items-center gap-4 border border-warning/30 bg-warning/5 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-6 h-6 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Avatar required for try-on</p>
        <p className="text-xs text-muted-foreground">
          Create a 3D avatar to virtually try on clothes
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate('/')}
        className="shrink-0 bg-gradient-to-r from-primary to-secondary"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1" />
        Create
      </Button>
    </div>
  );
};

export default AvatarRequiredBanner;
