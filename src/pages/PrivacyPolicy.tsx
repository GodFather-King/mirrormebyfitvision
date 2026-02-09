import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-radial)' }} />
        <div className="relative max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-xs text-muted-foreground">Last updated: February 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 pb-20 max-w-lg mx-auto space-y-6">
        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you use MirrorMe, we collect the following information:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Email address and account credentials</li>
            <li>Photos you upload for avatar generation</li>
            <li>Body measurements derived from your photos</li>
            <li>Wardrobe items and clothing preferences</li>
            <li>Chat messages and style interactions</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">2. How We Use Your Data</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Generate your personalised 3D avatar</li>
            <li>Provide virtual try-on experiences</li>
            <li>Offer AI-powered style recommendations</li>
            <li>Improve our services and user experience</li>
            <li>Process payments for premium features</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">3. Photo & Avatar Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Photos you upload are processed by AI to create your avatar and extract body measurements. 
            Your original photos are stored securely and are never shared with third parties. 
            You can delete your photos and avatar data at any time from your profile settings.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">4. Data Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell your personal data. We may share anonymised, aggregated data with partner brands 
            to improve fit recommendations. Your photos and measurements are never shared with brands or 
            other users without your explicit consent.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">5. Data Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use industry-standard encryption and secure cloud infrastructure to protect your data. 
            All communications are encrypted via TLS. Access to user data is strictly controlled and monitored.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">6. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In accordance with the Protection of Personal Information Act (POPIA) of South Africa, you have the right to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">7. Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe is not intended for users under the age of 13. We do not knowingly collect 
            personal information from children.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">8. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-sm text-foreground font-medium">
            FitVision (Pty) Ltd, South Africa
          </p>
          <p className="text-sm text-muted-foreground">
            Email: privacy@fitvision.co.za
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
