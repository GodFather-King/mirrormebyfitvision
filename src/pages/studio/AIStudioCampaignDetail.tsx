import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import StudioNav from '@/components/studio/StudioNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import CampaignResultsGrid from '@/components/studio/CampaignResultsGrid';

const AIStudioCampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [images, setImages] = useState<{ url: string; index: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: c } = await (supabase.from('ai_campaigns') as any).select('*').eq('id', id).maybeSingle();
      setCampaign(c);
      const { data: imgs } = await (supabase.from('ai_campaign_images') as any)
        .select('image_url, variation_index')
        .eq('campaign_id', id)
        .order('variation_index', { ascending: true });
      setImages(((imgs as any[]) || []).map((i) => ({ url: i.image_url, index: i.variation_index })));
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!campaign) return (
    <div className="min-h-screen bg-background"><Header /><StudioNav />
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Card className="p-10 text-center">
          <p>Campaign not found.</p>
          <Button className="mt-4" onClick={() => navigate('/brand/studio/campaigns')}>Back to campaigns</Button>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <StudioNav />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/brand/studio/campaigns')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> All campaigns
        </Button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">{campaign.name}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="capitalize">{campaign.scene_preset.replace('-', ' ')}</Badge>
            {campaign.aesthetic && <Badge variant="outline" className="capitalize">{String(campaign.aesthetic).replace('-', ' ')}</Badge>}
            <Badge variant={campaign.status === 'ready' ? 'default' : 'secondary'}>{campaign.status}</Badge>
          </div>
        </div>

        {campaign.garment_image_url && (
          <Card className="p-3 flex gap-3 items-center max-w-md">
            <img src={campaign.garment_image_url} alt="garment" className="w-16 h-20 object-contain bg-muted rounded" />
            <div>
              <p className="text-xs text-muted-foreground">Source garment</p>
              <p className="text-sm font-medium">Used for all variations</p>
            </div>
          </Card>
        )}

        <CampaignResultsGrid images={images} watermark />
      </div>
    </div>
  );
};

export default AIStudioCampaignDetail;
