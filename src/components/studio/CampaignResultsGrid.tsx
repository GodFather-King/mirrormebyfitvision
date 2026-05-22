import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, MessageCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { addWatermarkToImage } from '@/lib/watermarkImage';

interface Props {
  images: { url: string; index: number }[];
  watermark?: boolean;
}

const downloadImage = async (url: string, watermark: boolean) => {
  try {
    let blob: Blob | null = null;
    if (watermark) {
      blob = await addWatermarkToImage(url, 'Generated with MirrorMe AI Fashion Studio');
    }
    if (!blob) {
      const res = await fetch(url);
      blob = await res.blob();
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mirrorme-campaign-${Date.now()}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch {
    toast.error('Download failed');
  }
};

const CampaignResultsGrid = ({ images, watermark = true }: Props) => {
  if (!images.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {images.map((img) => (
        <Card key={img.index} className="overflow-hidden">
          <div className="aspect-[3/4] bg-muted">
            <img src={img.url} alt={`Variation ${img.index + 1}`} className="w-full h-full object-cover" />
          </div>
          <div className="p-2 flex flex-wrap gap-1">
            <Button size="sm" variant="secondary" className="h-7 text-xs flex-1" onClick={() => downloadImage(img.url, watermark)}>
              <Download className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(img.url)}`, '_blank')}
              title="Share to WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ url: img.url }); } catch { /* cancelled */ }
                } else {
                  await navigator.clipboard.writeText(img.url);
                  toast.success('Link copied — paste into Instagram');
                }
              }}
              title="Share / Instagram"
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(img.url);
                toast.success('Image URL copied');
              }}
              title="Copy URL"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CampaignResultsGrid;
