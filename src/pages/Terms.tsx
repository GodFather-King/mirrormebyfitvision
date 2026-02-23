import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '@/components/AppFooter';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-radial)' }} />
        <div className="relative max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Terms & Conditions</h1>
          </div>
          <p className="text-xs text-muted-foreground">Last Updated: 23 February 2026</p>
        </div>
      </section>

      <section className="px-4 pb-8 max-w-lg mx-auto space-y-6 flex-1">
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using MirrorMe™ ("the App"), you agree to the following terms. MirrorMe™ is a product of <strong className="text-foreground">FitVision (Pty) Ltd</strong>, registered in South Africa.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">1. Use of the App</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe provides AI-powered avatar creation and virtual try-on features. You agree to use the App for lawful, personal, non-commercial purposes only.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">2. Account Responsibility</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials. All activities under your account are your responsibility.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">3. Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All content, designs, algorithms, and technology within MirrorMe™ are the property of FitVision (Pty) Ltd. Provisional Patent Pending — Application No. 2025/06894, South Africa. Unauthorized reproduction or distribution is prohibited.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">4. User Content</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Photos and data you upload remain yours. By uploading, you grant MirrorMe a limited licence to process this content solely to provide the App's features.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">5. Payments & Subscriptions</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paid features are billed via our payment partners. All fees are in South African Rand (ZAR) unless otherwise stated. Refunds are subject to our refund policy.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">6. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe is provided "as is." FitVision (Pty) Ltd shall not be liable for any indirect, incidental, or consequential damages arising from the use of the App.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">7. Changes to Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. Continued use of the App constitutes acceptance of the revised Terms.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">8. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:
          </p>
          <p className="text-sm text-foreground font-medium">📧 Sibonakalisogama@gmail.com</p>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default Terms;
