import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LimitReachedModalProps {
  open: boolean;
  onClose: () => void;
  type?: 'try-on' | 'scan';
}

const LimitReachedModal = ({ open, onClose, type = 'try-on' }: LimitReachedModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto text-center">
        <DialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-display">
            {type === 'scan' ? 'Daily Scan Limit Reached' : 'Weekly Try-On Limit Reached'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            {type === 'scan'
              ? "You've used all your free scans for today."
              : "You've used all your free try-ons for this week."}
            <br />
            Upgrade to Premium to unlock unlimited try-ons and scans.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full bg-gradient-to-r from-primary to-secondary"
            size="lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            <Clock className="w-4 h-4 mr-2" />
            {type === 'scan' ? 'Come Back Tomorrow' : 'Come Back Next Week'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LimitReachedModal;
