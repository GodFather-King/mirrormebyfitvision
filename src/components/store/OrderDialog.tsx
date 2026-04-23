import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Send, ShoppingBag, LogIn, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildDeliveryOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import { logBrandEvent } from '@/lib/brandEvents';
import DeliveryFormFields, {
  DeliveryFormState,
  emptyDeliveryForm,
  persistDeliveryPrefill,
} from './DeliveryFormFields';

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
  /** Try-on image to attach. Required for orders when available. */
  tryOnImageUrl?: string | null;
}

const deliverySchema = z.object({
  customer_name: z.string().trim().min(1, 'Full name is required').max(100),
  customer_phone: z
    .string()
    .trim()
    .min(7, 'Phone number is required')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s+()-]+$/, 'Use digits and + ( ) - only'),
  delivery_street: z.string().trim().min(1, 'Street address is required').max(200),
  delivery_area: z.string().trim().min(1, 'Area is required').max(100),
  delivery_city: z.string().trim().min(1, 'City is required').max(100),
  size: z.string().min(1, 'Please select a size').max(10),
  message: z.string().trim().max(500).optional().or(z.literal('')),
});

const OrderDialog = ({ open, onOpenChange, brand, item, tryOnImageUrl }: OrderDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [form, setForm] = useState<DeliveryFormState>(emptyDeliveryForm);
  const [submitting, setSubmitting] = useState(false);

  // Reset only the per-order bits when reopening, keep prefilled details.
  useEffect(() => {
    if (!open) {
      setForm((f) => ({ ...f, size: '', message: '' }));
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
    // HARD REQUIREMENT: try-on image must exist before any order is sent.
    if (!tryOnImageUrl) {
      toast.error('You must try on this item before ordering');
      return;
    }

    const parsed = deliverySchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || 'Please complete every required field');
      return;
    }

    // Save reusable bits for next time
    persistDeliveryPrefill(form);

    setSubmitting(true);
    try {
      if (isInbox) {
        const { error } = await (supabase.from('brand_orders') as any).insert({
          brand_id: brand.id,
          item_id: item.id,
          customer_user_id: user?.id ?? null,
          customer_name: parsed.data.customer_name,
          customer_phone: parsed.data.customer_phone,
          delivery_street: parsed.data.delivery_street,
          delivery_area: parsed.data.delivery_area,
          delivery_city: parsed.data.delivery_city,
          size: parsed.data.size,
          message: parsed.data.message || null,
          try_on_image_url: tryOnImageUrl, // guaranteed non-null at this point
          status: 'pending',
        });
        if (error) throw error;

        logBrandEvent({
          eventType: 'inbox_order_placed',
          brandId: brand.id,
          itemId: item.id,
          metadata: { size: parsed.data.size, has_try_on: true },
        });

        toast.success(`Order sent to ${brand.name}! They'll be in touch soon.`);
        onOpenChange(false);
      } else {
        if (!brand.whatsapp_number) {
          toast.error('This brand has no WhatsApp number set');
          return;
        }
        const text = buildDeliveryOrderMessage({
          itemName: item.name,
          size: parsed.data.size,
          customerName: parsed.data.customer_name,
          customerPhone: parsed.data.customer_phone,
          street: parsed.data.delivery_street,
          area: parsed.data.delivery_area,
          city: parsed.data.delivery_city,
          customerMessage: parsed.data.message,
          tryOnImageUrl, // guaranteed non-null
        });

        logBrandEvent({
          eventType: 'whatsapp_order_clicked',
          brandId: brand.id,
          itemId: item.id,
          metadata: { size: parsed.data.size, source: 'order_dialog', has_try_on: true },
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-4">
            {/* Try-on preview tag */}
            {tryOnImageUrl ? (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <img
                  src={tryOnImageUrl}
                  alt="Your try-on"
                  className="w-12 h-16 rounded object-cover bg-muted shrink-0"
                />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Try-on attached</p>
                  <p className="text-muted-foreground">
                    The brand will see how this looks on you.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-dashed">
                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tip: tap "Try On" first so the brand can see the look on your avatar.
                </p>
              </div>
            )}

            <DeliveryFormFields value={form} onChange={setForm} />

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
            <p className="text-[10px] text-center text-muted-foreground">
              By placing this order you agree to share these details with {brand.name}.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDialog;
