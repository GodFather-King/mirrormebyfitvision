import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Shield, Brain, Leaf } from 'lucide-react';

interface BenefitsSummaryProps {
  onContinue: () => void;
  onBack: () => void;
}

const benefits = [
  {
    icon: Shield,
    title: "Confidence in every purchase",
    color: "text-primary"
  },
  {
    icon: Brain,
    title: "Smarter buying decisions",
    color: "text-secondary"
  },
  {
    icon: Leaf,
    title: "Fewer returns, less waste",
    color: "text-primary"
  }
];

const BenefitsSummary = ({ onContinue, onBack }: BenefitsSummaryProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
      {/* Header */}
      <div className="mb-12 animate-fade-in">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
          <span className="gradient-text">Shop with confidence.</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Make smarter decisions. Every time.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid gap-6 max-w-md w-full mb-12">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="glass-card p-6 flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center ${benefit.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-lg font-medium text-foreground text-left">
                {benefit.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 animate-fade-in-delay-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="lg"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        <Button
          onClick={onContinue}
          size="lg"
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground px-8 rounded-full glow-box group"
        >
          Let's get started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export default BenefitsSummary;
