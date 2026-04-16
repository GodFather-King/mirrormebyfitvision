import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'validating' | 'valid' | 'already' | 'invalid' | 'submitting' | 'success' | 'error';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('validating');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (res.ok && data.valid === true) {
          setStatus('valid');
        } else if (data.reason === 'already_unsubscribed') {
          setStatus('already');
        } else {
          setStatus('invalid');
          setErrorMsg(data.error || 'Invalid or expired link');
        }
      } catch {
        setStatus('invalid');
        setErrorMsg('Could not validate link');
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('success');
      } else if (data?.reason === 'already_unsubscribed') {
        setStatus('already');
      } else {
        setStatus('error');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative glass-card border border-border/50 p-8 max-w-md w-full text-center bg-background/80 backdrop-blur-xl rounded-2xl">
        {status === 'validating' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="font-display text-xl font-semibold mb-2">Checking your link...</h1>
          </>
        )}

        {status === 'valid' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
              <MailX className="w-8 h-8 text-warning" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Unsubscribe from MirrorMe?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              You'll stop receiving onboarding emails. You can still use MirrorMe normally.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleConfirm}
                size="lg"
                variant="destructive"
                className="w-full"
              >
                Confirm Unsubscribe
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {status === 'submitting' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="font-display text-xl font-semibold mb-2">Unsubscribing...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We won't send you onboarding emails anymore. Sorry to see you go!
            </p>
            <Button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-primary to-secondary">
              Back to MirrorMe
            </Button>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Already unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This email address is already unsubscribed. Nothing more to do.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Back to MirrorMe
            </Button>
          </>
        )}

        {(status === 'invalid' || status === 'error') && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Link not valid</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {errorMsg || 'This unsubscribe link is invalid or has expired.'}
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Back to MirrorMe
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
