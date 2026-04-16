import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Gift, Copy, Share2, MessageCircle, Loader2, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  rewarded_at: string | null;
}

const Referrals = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const [codeRes, refsRes, creditsRes] = await Promise.all([
        supabase.from('referral_codes').select('code').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('referrals')
          .select('id, status, created_at, rewarded_at')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('bonus_credits').select('amount').eq('user_id', user.id),
      ]);

      let resolvedCode = codeRes.data?.code ?? null;
      // Fallback: create a code if none exists yet (e.g. older account without trigger run)
      if (!resolvedCode) {
        const newCode = Math.random().toString(36).slice(2, 10).toUpperCase();
        const { data: inserted } = await supabase
          .from('referral_codes')
          .insert({ user_id: user.id, code: newCode })
          .select('code')
          .maybeSingle();
        resolvedCode = inserted?.code ?? newCode;
      }
      setCode(resolvedCode);
      setReferrals((refsRes.data ?? []) as ReferralRow[]);
      const total = (creditsRes.data ?? []).reduce(
        (sum, r: { amount: number }) => sum + (r.amount ?? 0),
        0
      );
      setBonusCredits(total);
      setLoading(false);
    };
    load();
  }, [user]);

  const shareUrl = code ? `${window.location.origin}/?ref=${code}` : '';
  const shareMessage = `I'm using MirrorMe to virtually try on clothes before I buy. Sign up with my link and we both get bonus try-ons! ${shareUrl}`;

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank', 'noopener');
  };

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank', 'noopener');
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MirrorMe — Try clothes on your digital twin',
          text: shareMessage,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  const rewardedCount = referrals.filter(r => r.status === 'rewarded').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-box">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text">Invite friends, earn try-ons</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            For every friend who signs up and does their first try-on, you get
            <span className="text-foreground font-semibold"> +5 bonus try-ons</span> and they get
            <span className="text-foreground font-semibold"> +3</span>.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card border-0">
            <CardContent className="pt-5 pb-4 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{bonusCredits}</div>
              <div className="text-xs text-muted-foreground">Bonus try-ons</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{rewardedCount}</div>
              <div className="text-xs text-muted-foreground">Friends joined</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="pt-5 pb-4 text-center">
              <Gift className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Share card */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Your referral link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="bg-muted/50 border-border font-mono text-xs sm:text-sm"
              />
              <Button onClick={copyLink} variant="outline" size="icon" className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={shareWhatsApp} variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={shareTwitter} variant="outline" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                X / Twitter
              </Button>
              <Button onClick={shareFacebook} variant="outline" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button onClick={nativeShare} variant="default" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span className="font-semibold text-foreground">How it works:</span> Your friend signs up
              with your link → completes their first try-on → you both get bonus try-ons added on top of
              the weekly free limit.
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Referral history</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No referrals yet. Share your link to get started!
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {referrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">Friend joined</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={r.status === 'rewarded' ? 'default' : 'secondary'}>
                      {r.status === 'rewarded' ? '+5 earned' : 'Pending first try-on'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Pending means your friend signed up but hasn't completed their first try-on yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Referrals;
