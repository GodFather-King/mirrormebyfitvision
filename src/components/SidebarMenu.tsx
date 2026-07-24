import { useState, useEffect } from 'react';
import { Home, Shirt, Users, Camera, Plus, LogOut, LogIn, ShoppingBag, Crown, Sun, Moon, Info, HelpCircle, Download, Gift, RefreshCw, Loader2, ShieldCheck, Inbox, Sparkles, Repeat, Package, BarChart3, Wand2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import { useTheme } from '@/hooks/useTheme';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useWorkspace } from '@/hooks/useWorkspace';
import { SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import BuildVersionBadge from '@/components/BuildVersionBadge';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';

interface SidebarMenuProps {
  onClose: () => void;
}

const SidebarMenu = ({ onClose }: SidebarMenuProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isBrandOwner } = useBrandOwner();
  const { theme, toggleTheme } = useTheme();
  const { updateAvailable, isUpdating, isChecking, applyUpdate, checkForUpdates } = usePWAUpdate();
  const { workspace, clear: clearWorkspace } = useWorkspace();
  const activeWorkspace: 'consumer' | 'brand' = workspace ?? (isBrandOwner ? 'brand' : 'consumer');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info('To install, use your browser menu: Share → Add to Home Screen (iPhone) or Menu → Install app (Android)');
      onClose();
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('MirrorMe is being installed!');
    } else {
      toast.info('Installation cancelled');
    }
    setDeferredPrompt(null);
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  const consumerItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Sparkles, label: 'Try-On', path: '/' },
    { icon: ShoppingBag, label: 'Shop by Brand', path: '/brands' },
    { icon: Shirt, label: 'Wardrobe', path: '/wardrobe' },
    { icon: Heart, label: 'Wishlist', path: '/saved-outfits' },
    { icon: Sparkles, label: 'My Try-Ons', path: '/try-on-history' },
    { icon: Users, label: 'Saved Avatars', path: '/saved-avatars' },
    { icon: Crown, label: 'Pricing & Upgrade', path: '/pricing' },
    { icon: Gift, label: 'Invite Friends', path: '/referrals' },
  ];

  const brandItems = [
    { icon: Home, label: 'Dashboard', path: '/brand/dashboard' },
    { icon: Package, label: 'Products', path: '/brand/dashboard' },
    { icon: Inbox, label: 'Orders', path: '/brand/dashboard' },
    { icon: Wand2, label: 'AI Fashion Studio', path: '/brand/studio' },
    { icon: Sparkles, label: 'Campaigns', path: '/brand/studio/campaigns' },
    { icon: BarChart3, label: 'Analytics', path: '/brand/dashboard' },
  ];

  const navigationItems = [
    ...(activeWorkspace === 'brand' ? brandItems : consumerItems),
    { icon: Info, label: 'About', path: '/about' },
    { icon: HelpCircle, label: 'How to Use MirrorMe', path: '/how-it-works' },
    ...(isBrandOwner && activeWorkspace !== 'brand' ? [{ icon: Inbox, label: 'Brand Dashboard', path: '/brand/dashboard' }] : []),
    ...(isAdmin ? [{ icon: ShieldCheck, label: 'Admin Panel', path: '/admin' }] : []),
  ];

  const quickActions = activeWorkspace === 'brand'
    ? [
        { icon: Plus, label: 'New Campaign', action: () => handleNavigation('/brand/studio/create') },
        { icon: Package, label: 'Add Product', action: () => handleNavigation('/brand/dashboard') },
      ]
    : [
        { icon: Camera, label: 'Upload Photo', action: () => handleNavigation('/') },
        { icon: Plus, label: 'Add Clothing', action: () => handleNavigation('/wardrobe') },
      ];

  const handleSwitchWorkspace = () => {
    clearWorkspace();
    onClose();
    navigate('/welcome');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain py-4">
      {/* Logo Section */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-display font-bold text-xl gradient-text">MIRROR</span>
          <span className="font-display font-bold text-xl text-foreground">ME</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
          {activeWorkspace === 'brand' ? 'Brand' : 'Try-On'}
        </span>
      </div>

      {user && (
        <div className="px-2 mb-2">
          <button
            onClick={handleSwitchWorkspace}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Repeat className="w-5 h-5" />
            <span className="font-medium">Switch Workspace</span>
          </button>
        </div>
      )}

      <Separator className="mb-4" />

      {/* Navigation Section */}
      <div className="px-2 mb-4">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Navigation
        </p>
        <nav className="space-y-1">
          {navigationItems.map((item, idx) => (
            <SheetClose asChild key={`${item.path}-${idx}`}>
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

      {/* Install App Section */}
      <Separator className="mb-4" />
      <div className="px-2 mb-4">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          App
        </p>
        <button
          onClick={async () => {
            if (updateAvailable) {
              await applyUpdate();
              return;
            }

            await checkForUpdates();
          }}
          disabled={isUpdating || isChecking}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            updateAvailable
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'text-foreground hover:bg-muted/50'
          } disabled:opacity-60`}
        >
          {isUpdating || isChecking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className={`w-5 h-5 ${updateAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
          <span className="font-medium flex-1 text-left">
            {isUpdating
              ? 'Updating...'
              : isChecking
                ? 'Checking...'
                : updateAvailable
                  ? 'Update Available'
                  : 'Check for Updates'}
          </span>
          {updateAvailable && !isUpdating && !isChecking && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </button>
        <SheetClose asChild>
          <button
            onClick={handleInstall}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Install App</span>
          </button>
        </SheetClose>
      </div>

      {/* Theme Toggle */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <Switch checked={theme === 'light'} onCheckedChange={toggleTheme} />
        </div>
      </div>

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

      <BuildVersionBadge />
    </div>
  );
};

export default SidebarMenu;
