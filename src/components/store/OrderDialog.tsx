import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MessageCircle, Send, ShoppingBag, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import { logBrandEvent } from '@/lib/brandEvents';

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: {
    id: string;
    name: string;
    slug: string;
    whatsapp_number: string | null;
    order_method: 'whatsapp' | 'inbox';
  } | null;
  item: {
    id: string;
    name: string;
    category: string;
  } | null;
  tryOnImageUrl?: string | null;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const orderSchema = z.object({
  customer_name: z.string().trim().min(1, 'Name is required').max(100),
  customer_email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  size: z.string().min(1, 'Please select a size').max(10),
  message: z.string().trim().max(500).optional().or(z.literal('')),
});

const OrderDialog = ({ open, onOpenChange, brand, item, tryOnImageUrl }: OrderDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [size, setSize] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSize('');
      setMessage('');
      setSubmitting(false);
    }
  }, [open]);

  if (!brand || !item) return null;

  const isInbox = brand.order_method === 'inbox';
  const requiresLogin = isInbox && !user;

  const handleSignIn = () => {
    onOpenChange(false);
    navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const handleSubmit = async () => {
    const parsed = orderSchema.safeParse({
      customer_name: name,
      customer_email: email,
      size,
      message,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || 'Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (isInbox) {
        const { error } = await (supabase.from('brand_orders') as any).insert({
          brand_id: brand.id,
          item_id: item.id,
          customer_user_id: user?.id ?? null,
          customer_name: parsed.data.customer_name,
          customer_email: parsed.data.customer_email || null,
          size: parsed.data.size,
          message: parsed.data.message || null,
          try_on_image_url: tryOnImageUrl || null,
          status: 'pending',
        });
        if (error) throw error;

        logBrandEvent({
          eventType: 'inbox_order_placed',
          brandId: brand.id,
          itemId: item.id,
          metadata: { size: parsed.data.size },
        });

        toast.success(`Order sent to ${brand.name}! They'll be in touch soon.`);
        onOpenChange(false);
      } else {
        if (!brand.whatsapp_number) {
          toast.error('This brand has no WhatsApp number set');
          return;
        }
        const tryOnLine = tryOnImageUrl ? `\nTry-on preview: ${tryOnImageUrl}` : '';
        const customMsgLine = parsed.data.message ? `\nNote: ${parsed.data.message}` : '';
        const text =
          buildOrderMessage({
            itemName: item.name,
            recommendedSize: parsed.data.size,
          }) + `\nMy name: ${parsed.data.customer_name}` + customMsgLine + tryOnLine;

        logBrandEvent({
          eventType: 'whatsapp_order_clicked',
          brandId: brand.id,
          itemId: item.id,
          metadata: { size: parsed.data.size, source: 'order_dialog' },
        });

        window.open(buildWhatsAppUrl(brand.whatsapp_number, text), '_blank', 'noopener');
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error('Order submit failed', err);
      toast.error(err?.message || 'Could not place your order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            I want this — {item.name}
          </DialogTitle>
          <DialogDescription>
            {isInbox
              ? `Send your order directly to ${brand.name}'s inbox.`
              : `Order via WhatsApp from ${brand.name}.`}
          </DialogDescription>
        </DialogHeader>

        {requiresLogin ? (
          <div className="py-4 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in to place an order with {brand.name} and track it in your account.
            </p>
            <Button onClick={handleSignIn} className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in to continue
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Size *</Label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={
                      'px-3 py-1.5 text-xs rounded-full border transition-colors ' +
                      (size === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:border-primary')
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order-name">Your name *</Label>
              <Input
                id="order-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah"
                maxLength={100}
              />
            </div>

            {isInbox && (
              <div className="space-y-1.5">
                <Label htmlFor="order-email">Email (optional)</Label>
                <Input
                  id="order-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="order-message">Message (optional)</Label>
              <Textarea
                id="order-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything the brand should know?"
                rows={2}
                maxLength={500}
              />
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isInbox ? (
                <Send className="w-4 h-4 mr-2" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              {isInbox ? 'Send order' : 'Continue on WhatsApp'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDialog;
