import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Sparkles } from 'lucide-react';

interface PostTryOnPromptProps {
  open: boolean;
  onClose: () => void;
  onSaveOutfit: () => void;
  onTryAnother: () => void;
  itemName?: string;
}

const PostTryOnPrompt = React.forwardRef<React.ElementRef<typeof SheetContent>, PostTryOnPromptProps>(
  ({ open, onClose, onSaveOutfit, onTryAnother, itemName }, ref) => {
    return (
      <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
        <SheetContent ref={ref} side="bottom" className="rounded-t-2xl pb-8 pt-6 px-6 max-h-[40vh]">
          <SheetHeader className="items-center text-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <SheetTitle className="text-lg font-display">🔥 This look fits you well!</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {itemName ? `"${itemName}" looks great on you.` : 'Love this look?'} Save it to your collection or keep styling.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3">
            <Button
              onClick={onSaveOutfit}
              className="w-full bg-gradient-to-r from-primary to-secondary"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Outfit
            </Button>
            <Button
              variant="outline"
              onClick={onTryAnother}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

PostTryOnPrompt.displayName = 'PostTryOnPrompt';

export default PostTryOnPrompt;
