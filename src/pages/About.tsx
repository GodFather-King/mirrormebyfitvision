import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from '@/components/AppFooter';

const About = () => {
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
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">About MirrorMe</h1>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 max-w-lg mx-auto space-y-6 flex-1">
        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">What is MirrorMe?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe™ is an AI-powered virtual fitting room that lets you create a realistic 3D avatar from a single photo, try on clothes from your wardrobe or partner brands, and shop with confidence — knowing exactly how items will look and fit on your body.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">Our Mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We believe everyone deserves to see themselves in the clothes they love — before they buy. Our mission is to reduce returns, empower shoppers, and bring the fitting room to your fingertips.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">Company</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MirrorMe™ is a product of <strong className="text-foreground">FitVision (Pty) Ltd</strong>, a South African technology company focused on body measurement and virtual try-on innovation.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Provisional Patent Pending — Application No. 2025/06894, filed in South Africa. All rights reserved.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions or partnership enquiries? Reach us at:
          </p>
          <p className="text-sm text-foreground font-medium">📧 Sibonakalisogama@gmail.com</p>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default About;
