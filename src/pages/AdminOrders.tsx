import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Inbox, CheckCircle2, Clock, PackageCheck, XCircle, ShoppingBag, Phone, MapPin, ExternalLink } from 'lucide-react';
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

interface BrandLite {
  id: string;
  name: string;
  slug: string;
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

const AdminOrders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [brands, setBrands] = useState<BrandLite[]>([]);
  const [items, setItems] = useState<Record<string, ItemLite>>({});
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && user && !isAdmin) {
      toast.error('Admin access only');
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [ordersRes, brandsRes, itemsRes] = await Promise.all([
      (supabase.from('brand_orders') as any).select('*').order('created_at', { ascending: false }),
      supabase.from('brands').select('id, name, slug').order('name'),
      supabase.from('brand_items').select('id, product_name, product_image'),
    ]);
    setOrders((ordersRes.data as Order[]) || []);
    setBrands((brandsRes.data as BrandLite[]) || []);
    const itemMap: Record<string, ItemLite> = {};
    ((itemsRes.data as ItemLite[]) || []).forEach((it) => {
      itemMap[it.id] = it;
    });
    setItems(itemMap);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  // Realtime subscribe to new orders
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('admin-brand-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_orders' }, () => {
        loadAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

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
    return orders.filter((o) => {
      if (brandFilter !== 'all' && o.brand_id !== brandFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, brandFilter, statusFilter]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });
    return byStatus;
  }, [orders]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Orders Inbox</h1>
          </div>
        </div>

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

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Filter brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
              Clear status filter
            </Button>
          )}
        </div>

        {/* Orders */}
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Orders placed via Inbox-mode brands will appear here in realtime.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const brand = brands.find((b) => b.id === o.brand_id);
              const item = o.item_id ? items[o.item_id] : undefined;
              const meta = STATUS_META[o.status];
              const StatusIcon = meta.icon;
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
                          {brand?.name || 'Brand removed'} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
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
                          href={`https://wa.me/${(o.customer_phone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {o.customer_phone}
                        </a>
                      )}
                      {o.customer_email && (
                        <p className="text-muted-foreground truncate">{o.customer_email}</p>
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

export default AdminOrders;
