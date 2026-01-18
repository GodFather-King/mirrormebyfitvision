import { Home, Camera, Shirt, User, Settings } from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const navItems: { id: string; icon: React.ElementType; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'wardrobe', icon: Shirt, label: 'Wardrobe' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/50 px-4 py-2 safe-area-inset-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
