import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBrandOwner, OwnedBrand } from '@/hooks/useBrandOwner';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  Inbox,
  CheckCircle2,
  Clock,
  PackageCheck,
  XCircle,
  ShoppingBag,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Order {
  id: string;
  brand_id: string;
  item_id: string | null;
  customer_user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_street: string | null;
  delivery_area: string | null;
  delivery_city: string | null;
  size: string | null;
  message: string | null;
  try_on_image_url: string | null;
  status: OrderStatus;
  created_at: string;
}

interface ItemLite {
  id: string;
  product_name: string | null;
  product_image: string;
}

const STATUS_META: Record<OrderStatus, { label: string; icon: any; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', icon: Clock, variant: 'secondary' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, variant: 'default' },
  completed: { label: 'Completed', icon: PackageCheck, variant: 'outline' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'destructive' },
};

const BrandDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { brands: ownedBrands, loading: ownerLoading, isBrandOwner } = useBrandOwner();

  const [selectedBrand, setSelectedBrand] = useState<OwnedBrand | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, ItemLite>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?next=${encodeURIComponent('/brand/dashboard')}`);
    }
  }, [user, authLoading, navigate]);

  // Default-select first owned brand
  useEffect(() => {
    if (!selectedBrand && ownedBrands.length > 0) {
      setSelectedBrand(ownedBrands[0]);
    }
  }, [ownedBrands, selectedBrand]);

  const loadData = async (brandId: string) => {
    setLoading(true);
    const [ordersRes, itemsRes] = await Promise.all([
      (supabase.from('brand_orders') as any)
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false }),
      supabase
        .from('brand_items')
        .select('id, product_name, product_image')
        .eq('linked_brand_id', brandId),
    ]);
    setOrders((ordersRes.data as Order[]) || []);
    const itemMap: Record<string, ItemLite> = {};
    ((itemsRes.data as ItemLite[]) || []).forEach((it) => {
      itemMap[it.id] = it;
    });
    setItems(itemMap);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedBrand) loadData(selectedBrand.id);
  }, [selectedBrand]);

  // Realtime updates for THIS brand's orders only
  useEffect(() => {
    if (!selectedBrand) return;
    const channel = supabase
      .channel(`brand-orders-${selectedBrand.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brand_orders', filter: `brand_id=eq.${selectedBrand.id}` },
        () => loadData(selectedBrand.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBrand]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const prev = orders;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await (supabase.from('brand_orders') as any).update({ status }).eq('id', id);
    if (error) {
      setOrders(prev);
      toast.error(error.message);
    } else {
      toast.success(`Marked as ${STATUS_META[status].label.toLowerCase()}`);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => statusFilter === 'all' || o.status === statusFilter);
  }, [orders, statusFilter]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });
    return byStatus;
  }, [orders]);

  const copyStoreLink = async (slug: string) => {
    const url = `${window.location.origin}/store/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Store link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Loading state
  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not an owner
  if (!isBrandOwner) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-10">
          <Card className="p-8 text-center space-y-4">
            <Store className="w-12 h-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold">No brand linked to your account</h1>
            <p className="text-sm text-muted-foreground">
              Brand dashboards are available to owners of approved brands on MirrorMe.
              If you've recently signed up your brand, ask an admin to link your account
              so you can see incoming orders here.
            </p>
            <Button variant="outline" onClick={() => navigate('/local-brands')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to brands
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Inbox className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Brand Dashboard</h1>
          </div>
        </div>

        {/* Brand picker (only if multiple) */}
        {ownedBrands.length > 1 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedBrand?.id ?? ''}
              onValueChange={(v) => setSelectedBrand(ownedBrands.find((b) => b.id === v) || null)}
            >
              <SelectTrigger className="w-60 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ownedBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Brand identity card */}
        {selectedBrand && (
          <Card className="p-3 flex items-center gap-3">
            {selectedBrand.logo_url ? (
              <img src={selectedBrand.logo_url} alt={selectedBrand.name} className="w-12 h-12 rounded-lg object-cover bg-muted" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Store className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{selectedBrand.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">/store/{selectedBrand.slug}</p>
              <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                Orders via {selectedBrand.order_method}
              </Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={() => copyStoreLink(selectedBrand.slug)} title="Copy store link">
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => window.open(`/store/${selectedBrand.slug}`, '_blank')} title="View store">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Card>
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => {
            const Icon = STATUS_META[s].icon;
            return (
              <Card
                key={s}
                className={
                  'p-3 cursor-pointer transition-colors ' +
                  (statusFilter === s ? 'border-primary' : 'hover:border-muted-foreground/40')
                }
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{STATUS_META[s].label}</p>
                </div>
                <p className="text-2xl font-bold mt-1">{counts[s] || 0}</p>
              </Card>
            );
          })}
        </div>

        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear status filter
          </Button>
        )}

        {/* Orders */}
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Orders placed via your store will appear here in realtime.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const item = o.item_id ? items[o.item_id] : undefined;
              const meta = STATUS_META[o.status];
              const StatusIcon = meta.icon;
              const phoneDigits = (o.customer_phone || '').replace(/\D/g, '');
              return (
                <Card key={o.id} className="p-3 flex gap-3">
                  <div className="w-20 h-28 rounded-md bg-muted overflow-hidden shrink-0">
                    {o.try_on_image_url ? (
                      <img src={o.try_on_image_url} alt="Try-on" className="w-full h-full object-cover" />
                    ) : item ? (
                      <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item?.product_name || 'Item removed'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                          {o.size ? ` · Size ${o.size}` : ''}
                        </p>
                      </div>
                      <Badge variant={meta.variant} className="shrink-0 gap-1">
                        <StatusIcon className="w-3 h-3" /> {meta.label}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-medium">{o.customer_name}</p>
                      {o.customer_phone && (
                        <a
                          href={phoneDigits ? `https://wa.me/${phoneDigits}` : `tel:${o.customer_phone}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {o.customer_phone}
                        </a>
                      )}
                      {(o.delivery_street || o.delivery_area || o.delivery_city) && (
                        <p className="flex items-start gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>
                            {o.delivery_street}
                            {o.delivery_street && (o.delivery_area || o.delivery_city) ? ', ' : ''}
                            {[o.delivery_area, o.delivery_city].filter(Boolean).join(', ')}
                          </span>
                        </p>
                      )}
                      {o.message && (
                        <p className="text-muted-foreground italic line-clamp-2">"{o.message}"</p>
                      )}
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {o.try_on_image_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => window.open(o.try_on_image_url!, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> View try-on
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandDashboard;
