import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Shirt, User, ShoppingBag, Store } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: { id: string; icon: React.ElementType; label: string; path: string }[] = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'local-brands', icon: Store, label: 'Local Brands', path: '/local-brands' },
    { id: 'online-brands', icon: ShoppingBag, label: 'Online Brands', path: '/brands' },
    { id: 'wardrobe', icon: Shirt, label: 'Wardrobe', path: '/wardrobe' },
    { id: 'profile', icon: User, label: 'Profile', path: '/saved-avatars' },
  ];

  const handleTabClick = (item: typeof navItems[0]) => {
    onTabChange(item.id);
    if (location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  // Determine active based on current path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/local-brands')) return 'local-brands';
    if (location.pathname === '/brands') return 'online-brands';
    if (location.pathname === '/wardrobe') return 'wardrobe';
    if (location.pathname === '/saved-avatars') return 'profile';
    return activeTab;
  };

  const currentActive = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/50 px-4 py-2 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around max-w-7xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentActive === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
