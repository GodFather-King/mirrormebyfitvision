import { Bell, Menu } from 'lucide-react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 px-4 py-3 safe-area-inset-top">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <button className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1">
          <span className="font-display font-bold text-lg gradient-text">FIT</span>
          <span className="font-display font-bold text-lg text-foreground">SCAN</span>
        </div>
        
        <button className="relative w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
};

export default Header;
