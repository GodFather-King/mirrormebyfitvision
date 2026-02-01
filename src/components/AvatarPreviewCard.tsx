import { useNavigate } from 'react-router-dom';
import { useAvatar } from '@/hooks/useAvatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, AlertTriangle } from 'lucide-react';

interface AvatarPreviewCardProps {
  showTryOnHint?: boolean;
  className?: string;
}

const AvatarPreviewCard = ({ showTryOnHint = true, className = '' }: AvatarPreviewCardProps) => {
  const navigate = useNavigate();
  const { avatarUrl, isLoading, source, hasAvatar } = useAvatar();

  const sourceLabel = source === 'account' 
    ? 'Saved to account' 
    : source === 'device' 
      ? 'Saved on this device' 
      : null;

  if (isLoading) {
    return (
      <div className={`glass-card p-3 flex items-center gap-3 ${className}`}>
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (hasAvatar && avatarUrl) {
    return (
      <div className={`glass-card p-3 flex items-center gap-3 ${className}`}>
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border-2 border-primary/30 flex-shrink-0">
          <img 
            src={avatarUrl} 
            alt="Your avatar" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Avatar Ready
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {sourceLabel && `${sourceLabel}`}
            {sourceLabel && showTryOnHint && ' • '}
            {showTryOnHint && 'Select items to try on'}
          </p>
        </div>
      </div>
    );
  }

  // No avatar state
  return (
    <div className={`glass-card p-3 flex items-center gap-3 ${className}`}>
      <div className="w-14 h-14 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-warning" />
          No Avatar Yet
        </p>
        <p className="text-xs text-muted-foreground">
          <button 
            onClick={() => navigate('/')} 
            className="text-primary hover:underline"
          >
            Create one
          </button>
          {' '}to try on clothes
        </p>
      </div>
    </div>
  );
};

export default AvatarPreviewCard;
