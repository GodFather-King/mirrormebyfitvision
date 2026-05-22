import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Plus, Images, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/brand/studio', label: 'Studio', icon: Home, exact: true },
  { to: '/brand/studio/create', label: 'Create', icon: Plus },
  { to: '/brand/studio/campaigns', label: 'Campaigns', icon: Images },
];

const StudioNav = () => {
  const { pathname } = useLocation();
  return (
    <div className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30">
      <div className="container max-w-5xl mx-auto px-4 h-12 flex items-center gap-1">
        <div className="flex items-center gap-2 mr-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold gradient-text hidden sm:inline">AI Fashion Studio</span>
        </div>
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StudioNav;
