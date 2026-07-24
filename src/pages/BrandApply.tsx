import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const CONTACT_EMAIL = 'brands@fitvision.co.za';

const BrandApply = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [website, setWebsite] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !whatsapp.trim()) {
      toast.error('Please add your brand name and WhatsApp number.');
      return;
    }
    const subject = encodeURIComponent(`Brand Partner Application: ${brandName}`);
    const body = encodeURIComponent(
      `Brand: ${brandName}\nWebsite: ${website || '—'}\nWhatsApp: ${whatsapp}\nAccount email: ${user?.email || '—'}\n\nNotes:\n${notes || '—'}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success('Application ready — send the email to complete your request.');
  };

  return (
    <div className="min-h-screen bg-background px-5 py-8 max-w-xl mx-auto">
      <button
        onClick={() => navigate('/welcome')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/70 to-primary/60 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold">Become a Brand Partner</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Tell us about your brand. Our team will set up your Brand Studio access within 1–2 business days.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Brand name *</Label>
          <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Kasi Threads" />
        </div>
        <div>
          <Label>Website / Instagram</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label>WhatsApp number *</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+27…" />
        </div>
        <div>
          <Label>Anything else?</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Categories, size range, based in…" />
        </div>

        <Button type="submit" className="w-full" size="lg">
          <Send className="w-4 h-4 mr-2" /> Submit Application
        </Button>
      </form>
    </div>
  );
};

export default BrandApply;
