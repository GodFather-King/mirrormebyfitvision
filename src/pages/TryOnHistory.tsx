import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchTryOnHistory,
  deleteTryOnHistoryEntry,
  TryOnHistoryRow,
} from '@/lib/tryOnHistory';
import { downloadWatermarkedImage } from '@/lib/downloadImage';
import ShareLookButton from '@/components/ShareLookButton';
import { toast } from 'sonner';

const TryOnHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<TryOnHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth?next=/try-on-history');
      return;
    }
    let active = true;
    setLoading(true);
    fetchTryOnHistory().then((r) => {
      if (active) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user, authLoading, navigate]);

  const handleDelete = async (row: TryOnHistoryRow) => {
    const ok = await deleteTryOnHistoryEntry(row.id, row.storage_path);
    if (ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success('Removed');
    } else {
      toast.error("Couldn't remove that try-on");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">My try-ons</h1>
            <p className="text-[11px] text-muted-foreground">
              Saved across all your devices
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              You haven't tried on anything yet.
            </p>
            <Button size="sm" onClick={() => navigate('/local-brands')}>
              Browse brands
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rows.map((row) => (
              <Card key={row.id} className="overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  <img
                    src={row.image_url}
                    alt={row.item_name || 'Try-on'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                  <p className="text-xs font-medium truncate">
                    {row.item_name || 'Untitled try-on'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mt-auto pt-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() =>
                        downloadWatermarkedImage(
                          row.image_url,
                          `mirrorme-${(row.item_name || 'look')
                            .replace(/\s+/g, '-')
                            .toLowerCase()}.jpg`
                        )
                      }
                    >
                      <Download className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <ShareLookButton
                      imageUrl={row.image_url}
                      itemName={row.item_name}
                      variant="outline"
                      size="sm"
                      label="Share"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] text-destructive hover:text-destructive"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TryOnHistory;
