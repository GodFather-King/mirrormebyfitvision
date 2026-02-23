import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '@/components/AppFooter';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
            <h1 className="font-display text-2xl font-bold">MirrorMe Privacy Policy</h1>
          </div>
          <p className="text-xs text-muted-foreground">Last Updated: 8 February 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 pb-8 max-w-lg mx-auto space-y-6 flex-1">
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe ("we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the MirrorMe mobile application and related services.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using MirrorMe, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe collects information necessary to provide virtual avatar creation, body measurements, and try-on features.
          </p>

          <h3 className="font-display text-sm font-semibold mt-3">a. Personal Information</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Name (optional)</li>
            <li>Email address</li>
            <li>User account details</li>
          </ul>

          <h3 className="font-display text-sm font-semibold mt-3">b. Body & Avatar Data</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Uploaded photos</li>
            <li>Body measurements (e.g. height, size, proportions)</li>
            <li>Avatar data generated from uploads</li>
          </ul>

          <h3 className="font-display text-sm font-semibold mt-3">c. Wardrobe & Shopping Data</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Uploaded clothing images</li>
            <li>Clothing measurements</li>
            <li>Virtual try-on interactions</li>
          </ul>

          <h3 className="font-display text-sm font-semibold mt-3">d. Usage & Technical Data</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>App interactions</li>
            <li>Device information</li>
            <li>Error logs (for app improvement)</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">2. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">We use your data to:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Generate and display personalized avatars</li>
            <li>Provide body measurement insights</li>
            <li>Enable virtual try-ons for personal wardrobes and brand items</li>
            <li>Improve app performance and user experience</li>
            <li>Communicate important updates and support messages</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not use your data for unrelated purposes.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">3. Data Storage & Security</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>User data is securely stored using industry-standard protection</li>
            <li>Avatar and measurement data is linked only to the user's account</li>
            <li>We take reasonable steps to prevent unauthorized access, misuse, or loss of data</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No system is 100% secure, but we actively work to protect your information.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">4. Data Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            MirrorMe does not sell user data.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">We may share limited data only:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>With trusted service providers needed to operate the app</li>
            <li>With brand partners only for virtual try-on purposes (no personal identity shared)</li>
            <li>If required by law or legal process</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">5. Payments & Transactions</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">If MirrorMe introduces paid features:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Payment details are processed securely by third-party providers</li>
            <li>MirrorMe does not store credit or debit card information</li>
          </ul>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">6. User Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">You have the right to:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Access your data</li>
            <li>Update or correct your information</li>
            <li>Delete your account and associated data</li>
            <li>Request clarification on how your data is used</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            To exercise these rights, contact us at:
          </p>
          <p className="text-sm text-foreground font-medium">
            📧 Sibonakalisogama@gmail.com
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">7. Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe is designed for users of all ages. If a user is under the age of 13, the app may only be used with the consent and involvement of a parent or legal guardian. Parents or guardians may create and manage avatars for children, including body measurements and wardrobe items, for personal use within the app.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">We:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Do not knowingly collect unnecessary personal information from children</li>
            <li>Use children's data only to enable avatar creation and virtual try-on features</li>
            <li>Do not sell or share children's data with third parties</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Parents or guardians may request access to or deletion of a child's data at any time by contacting us.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">8. Third-Party Links & Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe may contain links or integrations with third-party platforms. We are not responsible for the privacy practices of external services and encourage users to review their policies separately.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">9. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Any changes will be reflected in the app, and continued use of MirrorMe means acceptance of the updated policy.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">10. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy, contact us at:
          </p>
          <p className="text-sm text-foreground font-medium">
            📧 Sibonakalisogama@gmail.com
          </p>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default PrivacyPolicy;
