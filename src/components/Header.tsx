import { useState } from 'react';
import { Menu } from 'lucide-react';
import UserMenu from './UserMenu';
import SidebarMenu from './SidebarMenu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

interface HeaderProps {
  onOpenTutorial?: () => void;
}

const Header = ({ onOpenTutorial }: HeaderProps = {}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-lg gradient-text">MIRROR</span>
            <span className="font-display font-bold text-lg text-foreground">ME</span>
          </div>
          
          <UserMenu />
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarMenu onClose={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Header;
