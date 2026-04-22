import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface BrandLite {
  id: string;
  name: string;
}

interface OwnerRow {
  id: string;
  brand_id: string;
  user_id: string;
  brand_name?: string;
  display_name?: string | null;
}

interface Props {
  brands: BrandLite[];
}

const BrandOwnersPanel = ({ brands }: Props) => {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [brandId, setBrandId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brand_owners')
      .select('id, brand_id, user_id')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Failed to load brand owners');
      setLoading(false);
      return;
    }
    const rows = (data || []) as OwnerRow[];
    // Enrich with brand names + display names
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let profileMap: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.display_name]));
    }
    const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));
    setOwners(
      rows.map((r) => ({
        ...r,
        brand_name: brandMap[r.brand_id] || '—',
        display_name: profileMap[r.user_id] ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands.length]);

  const handleAssign = async () => {
    if (!email.trim() || !brandId) {
      toast.error('Enter an email and pick a brand');
      return;
    }
    setSaving(true);
    try {
      const { data: uid, error: rpcErr } = await supabase.rpc('get_user_id_by_email', {
        _email: email.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!uid) {
        toast.error('No MirrorMe account found for that email');
        return;
      }

      const { error: insErr } = await supabase
        .from('brand_owners')
        .insert({ user_id: uid as string, brand_id: brandId });
      if (insErr) {
        if (insErr.code === '23505') {
          toast.error('That user is already an owner of this brand');
        } else {
          throw insErr;
        }
        return;
      }
      toast.success('Brand owner assigned');
      setEmail('');
      setBrandId('');
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to assign owner');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this brand owner?')) return;
    const { error } = await supabase.from('brand_owners').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove');
      return;
    }
    toast.success('Owner removed');
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Assign brand owner
        </h2>
        <p className="text-xs text-muted-foreground">
          The user must already have a MirrorMe account. They&apos;ll see the Brand Dashboard
          link in their sidebar after sign-in.
        </p>

        <div className="space-y-2">
          <Label>User email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAssign} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Assign owner
        </Button>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Current owners ({owners.length})
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : owners.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No brand owners assigned yet.
          </Card>
        ) : (
          owners.map((o) => (
            <Card key={o.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{o.brand_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {o.display_name || 'User'} · {o.user_id.slice(0, 8)}…
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(o.id)}
                aria-label="Remove owner"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BrandOwnersPanel;
