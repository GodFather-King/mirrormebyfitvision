import { ChevronRight } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  whatsapp_number: string;
}

interface BrandCardProps {
  brand: Brand;
  onClick: () => void;
}

const BrandCard = ({ brand, onClick }: BrandCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full glass-card p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
    >
      {/* Brand logo */}
      <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
        {brand.logo_url ? (
          <img 
            src={brand.logo_url} 
            alt={brand.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-display font-bold text-primary">
            {brand.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Brand info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-foreground truncate">
          {brand.name}
        </h3>
        {brand.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {brand.description}
          </p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
};

export default BrandCard;
