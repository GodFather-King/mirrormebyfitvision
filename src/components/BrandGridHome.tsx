import { useNavigate } from 'react-router-dom';
import { ExternalLink, Upload, ShoppingBag } from 'lucide-react';

const BRANDS = [
  { name: 'SHEIN', url: 'https://www.shein.com', color: 'from-black to-zinc-800', emoji: '🛍️' },
  { name: 'ZARA', url: 'https://www.zara.com', color: 'from-zinc-900 to-zinc-700', emoji: '👔' },
  { name: 'H&M', url: 'https://www.hm.com', color: 'from-red-700 to-red-500', emoji: '👗' },
  { name: 'Mr Price', url: 'https://www.mrprice.co.za', color: 'from-orange-600 to-orange-400', emoji: '🏷️' },
  { name: 'BASH (TFG)', url: 'https://bash.com', color: 'from-purple-700 to-purple-500', emoji: '✨' },
];

const BrandGridHome = () => {
  const navigate = useNavigate();

  const handleBrandClick = (brand: typeof BRANDS[0]) => {
    // Navigate to brand try-on page with the brand pre-selected
    navigate('/brands', { state: { selectedBrand: brand.name, openUpload: true } });
    window.open(brand.url, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Shop by Brand</h3>
        </div>
        <button
          onClick={() => navigate('/brands')}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {BRANDS.map((brand) => (
          <button
            key={brand.name}
            onClick={() => handleBrandClick(brand)}
            className="glass-card p-3 flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all active:scale-95"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-xl`}
            >
              {brand.emoji}
            </div>
            <span className="text-xs font-semibold text-foreground leading-tight text-center">{brand.name}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <ExternalLink className="w-2.5 h-2.5" /> Try on
            </span>
          </button>
        ))}

        {/* Upload any brand */}
        <button
          onClick={() => navigate('/brands')}
          className="glass-card p-3 flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all active:scale-95 border border-dashed border-primary/30"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground leading-tight text-center">Other</span>
          <span className="text-[9px] text-muted-foreground">Upload</span>
        </button>
      </div>
    </div>
  );
};

export default BrandGridHome;
