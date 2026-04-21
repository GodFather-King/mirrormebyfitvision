import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus } from 'lucide-react';

interface SignupPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SignupPromptDialog = ({ open, onOpenChange }: SignupPromptDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goToAuth = () => {
    onOpenChange(false);
    navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create your avatar
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Create your avatar to see how this outfit looks on you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button onClick={goToAuth} className="w-full" size="lg">
            <UserPlus className="w-4 h-4 mr-2" />
            Sign up — it's free
          </Button>
          <Button onClick={goToAuth} variant="ghost" className="w-full">
            I already have an account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupPromptDialog;
