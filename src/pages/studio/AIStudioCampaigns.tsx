import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import StudioNav from '@/components/studio/StudioNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Images, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  scene_preset: string;
}
interface ImgRow { campaign_id: string; image_url: string; variation_index: number; }

const AIStudioCampaigns = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { brands, loading: ownerLoading, isAdmin } = useBrandOwner();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?next=/brand/studio/campaigns');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!brands.length) { setLoading(false); return; }
      const brandId = selectedBrandId || brands[0].id;
      if (!selectedBrandId) setSelectedBrandId(brandId);
      setLoading(true);
      const { data: rows } = await (supabase.from('ai_campaigns') as any)
        .select('id, name, status, created_at, scene_preset')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });
      const list = (rows as Campaign[]) || [];
      setCampaigns(list);
      if (list.length) {
        const { data: imgs } = await (supabase.from('ai_campaign_images') as any)
          .select('campaign_id, image_url, variation_index')
          .in('campaign_id', list.map((c) => c.id))
          .order('variation_index', { ascending: true });
        const map: Record<string, string> = {};
        ((imgs as ImgRow[]) || []).forEach((i) => {
          if (!map[i.campaign_id]) map[i.campaign_id] = i.image_url;
        });
        setThumbs(map);
      } else {
        setThumbs({});
      }
      setLoading(false);
    };
    if (!ownerLoading) load();
  }, [brands, ownerLoading, selectedBrandId]);

  const remove = async (id: string) => {
    const prev = campaigns;
    setCampaigns(prev.filter((c) => c.id !== id));
    const { error } = await (supabase.from('ai_campaigns') as any).delete().eq('id', id);
    if (error) { setCampaigns(prev); toast.error(error.message); }
    else toast.success('Campaign removed');
  };

  if (authLoading || ownerLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <StudioNav />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Your campaigns</h1>
            <p className="text-xs text-muted-foreground">All AI-generated shoots for your brand.</p>
          </div>
          <Button onClick={() => navigate('/brand/studio/create')} className="bg-gradient-to-r from-primary to-secondary text-primary-foreground gap-1.5">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>

        {!campaigns.length ? (
          <Card className="p-10 text-center">
            <Images className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first AI fashion shoot to see it here.</p>
            <Button className="mt-4" onClick={() => navigate('/brand/studio/create')}>Create campaign</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="overflow-hidden group">
                <div
                  className="aspect-[3/4] bg-muted cursor-pointer"
                  onClick={() => navigate(`/brand/studio/campaigns/${c.id}`)}
                >
                  {thumbs[c.id] ? (
                    <img src={thumbs[c.id]} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                    </div>
                    <Badge variant={c.status === 'ready' ? 'default' : c.status === 'failed' ? 'destructive' : 'secondary'} className="text-[9px]">
                      {c.status}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full h-7 text-xs mt-2 text-destructive hover:text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIStudioCampaigns;
