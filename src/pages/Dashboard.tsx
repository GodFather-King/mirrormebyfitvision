import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import Admin from './Admin';
import BrandDashboard from './BrandDashboard';

/**
 * Single unified dashboard entry point.
 * Role resolution (all enforced server-side via RLS + has_role):
 *   - Admin       → full platform Admin view
 *   - Brand Owner → BrandDashboard (auto-filtered to their brand(s))
 *   - Customer    → redirected to Virtual Try-On
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { isBrandOwner, loading: ownerLoading } = useBrandOwner();

  const loading = authLoading || adminLoading || ownerLoading;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent('/dashboard')}`, { replace: true });
      return;
    }
    if (loading) return;
    if (!isAdmin && !isBrandOwner) {
      // Customer → send to Virtual Try-On
      navigate('/', { replace: true });
    }
  }, [user, authLoading, loading, isAdmin, isBrandOwner, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) return <Admin />;
  if (isBrandOwner) return <BrandDashboard />;

  // Customer fallback while redirect runs
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Dashboard;
