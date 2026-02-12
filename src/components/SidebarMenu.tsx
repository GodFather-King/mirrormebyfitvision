import { Home, Shirt, Users, Camera, Plus, LogOut, LogIn, MessageCircle, ShoppingBag, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface SidebarMenuProps {
  onClose: () => void;
}

const SidebarMenu = ({ onClose }: SidebarMenuProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  const navigationItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageCircle, label: 'Style Chat', path: '/chat' },
    { icon: ShoppingBag, label: 'Shop by Brand', path: '/brands' },
    { icon: Shirt, label: 'Wardrobe', path: '/wardrobe' },
    { icon: Users, label: 'Saved Avatars', path: '/saved-avatars' },
    { icon: Crown, label: 'Pricing & Upgrade', path: '/pricing' },
  ];

  const quickActions = [
    { icon: Camera, label: 'Upload Photo', action: () => handleNavigation('/') },
    { icon: Plus, label: 'Add Clothing', action: () => handleNavigation('/wardrobe') },
  ];

  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1">
          <span className="font-display font-bold text-xl gradient-text">MIRROR</span>
          <span className="font-display font-bold text-xl text-foreground">ME</span>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Navigation Section */}
      <div className="px-2 mb-4">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Navigation
        </p>
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <SheetClose asChild key={item.path}>
              <button
                onClick={() => handleNavigation(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </button>
            </SheetClose>
          ))}
        </nav>
      </div>

      <Separator className="mb-4" />

      {/* Quick Actions Section */}
      <div className="px-2 mb-4">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </p>
        <div className="space-y-1">
          {quickActions.map((item, index) => (
            <SheetClose asChild key={index}>
              <button
                onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </button>
            </SheetClose>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      <Separator className="mb-4" />

      {/* Account Section */}
      <div className="px-2">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Account
        </p>
        {user ? (
          <SheetClose asChild>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </SheetClose>
        ) : (
          <SheetClose asChild>
            <button
              onClick={() => handleNavigation('/auth')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-medium">Sign In</span>
            </button>
          </SheetClose>
        )}
      </div>
    </div>
  );
};

export default SidebarMenu;
