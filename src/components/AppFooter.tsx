import { useNavigate } from 'react-router-dom';

const AppFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="px-4 py-6 text-center space-y-2 border-t border-border/30">
      <p className="text-xs text-muted-foreground/70">
        MirrorMe™ is a product of FitVision (Pty) Ltd.
      </p>
      <p className="text-[10px] text-muted-foreground/50">
        Provisional Patent Pending (Application No. 2025/06894, South Africa)
      </p>
      <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/50">
        <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">
          Privacy Policy
        </button>
        <span>·</span>
        <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">
          Terms & Conditions
        </button>
        <span>·</span>
        <button onClick={() => navigate('/about')} className="hover:text-foreground transition-colors">
          About
        </button>
      </div>
    </footer>
  );
};

export default AppFooter;
