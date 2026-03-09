import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Shirt, User, Store, ShoppingBag } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: { id: string; icon: React.ElementType; label: string; path: string }[] = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'brands', icon: ShoppingBag, label: 'Brands', path: '/brands' },
    { id: 'wardrobe', icon: Shirt, label: 'Wardrobe', path: '/wardrobe' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', path: '/chat' },
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
    if (location.pathname === '/shop') return 'shop';
    if (location.pathname === '/brands') return 'brands';
    if (location.pathname === '/wardrobe') return 'wardrobe';
    if (location.pathname === '/saved-avatars') return 'profile';
    if (location.pathname === '/chat') return 'chat';
    return activeTab;
  };

  const currentActive = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/50 px-4 py-2 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
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
