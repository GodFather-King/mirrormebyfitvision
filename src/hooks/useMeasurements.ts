import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface Measurements {
  height_cm: number;
  chest_cm: number;
  waist_cm: number;
  hips_cm: number;
  shoulders_cm: number;
  inseam_cm: number;
  body_type?: string;
}

// Size charts for common sizing (measurements in cm)
const SIZE_CHARTS = {
  tops: {
    XS: { chest: [76, 84], waist: [61, 69] },
    S: { chest: [84, 92], waist: [69, 77] },
    M: { chest: [92, 100], waist: [77, 85] },
    L: { chest: [100, 108], waist: [85, 93] },
    XL: { chest: [108, 116], waist: [93, 101] },
    XXL: { chest: [116, 124], waist: [101, 109] },
  },
  bottoms: {
    XS: { waist: [61, 69], hips: [84, 92] },
    S: { waist: [69, 77], hips: [92, 100] },
    M: { waist: [77, 85], hips: [100, 108] },
    L: { waist: [85, 93], hips: [108, 116] },
    XL: { waist: [93, 101], hips: [116, 124] },
    XXL: { waist: [101, 109], hips: [124, 132] },
  },
  dresses: {
    XS: { chest: [76, 84], waist: [61, 69], hips: [84, 92] },
    S: { chest: [84, 92], waist: [69, 77], hips: [92, 100] },
    M: { chest: [92, 100], waist: [77, 85], hips: [100, 108] },
    L: { chest: [100, 108], waist: [85, 93], hips: [108, 116] },
    XL: { chest: [108, 116], waist: [93, 101], hips: [116, 124] },
  },
  outerwear: {
    XS: { chest: [76, 84], shoulders: [38, 40] },
    S: { chest: [84, 92], shoulders: [40, 42] },
    M: { chest: [92, 100], shoulders: [42, 44] },
    L: { chest: [100, 108], shoulders: [44, 46] },
    XL: { chest: [108, 116], shoulders: [46, 48] },
    XXL: { chest: [116, 124], shoulders: [48, 50] },
  },
};

export const useMeasurements = () => {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLatestMeasurements();
    } else {
      setMeasurements(null);
      setAvatarUrl(null);
      setLoading(false);
    }
  }, [user]);

  const fetchLatestMeasurements = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_avatars')
      .select('measurements, front_view_url')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.measurements) {
      // Parse measurements from JSON
      const rawMeasurements = data.measurements;
      
      // Check if it's the new format or old format
      if (typeof rawMeasurements === 'object' && rawMeasurements !== null && !Array.isArray(rawMeasurements)) {
        const m = rawMeasurements as Record<string, unknown>;
        
        if ('height_cm' in m) {
          setMeasurements({
            height_cm: Number(m.height_cm) || 170,
            chest_cm: Number(m.chest_cm) || 92,
            waist_cm: Number(m.waist_cm) || 82,
            hips_cm: Number(m.hips_cm) || 98,
            shoulders_cm: Number(m.shoulders_cm) || 44,
            inseam_cm: Number(m.inseam_cm) || 81,
            body_type: String(m.body_type || 'average'),
          });
        } else if ('height' in m) {
          // Convert old format to new format
          const oldFormat = m as Record<string, { value: string; unit: string }>;
          setMeasurements({
            height_cm: parseInt(oldFormat.height?.value || '170'),
            chest_cm: parseInt(oldFormat.chest?.value || '92'),
            waist_cm: parseInt(oldFormat.waist?.value || '82'),
            hips_cm: parseInt(oldFormat.hips?.value || '98'),
            shoulders_cm: parseInt(oldFormat.shoulders?.value || '44'),
            inseam_cm: parseInt(oldFormat.inseam?.value || '81'),
            body_type: 'average',
          });
        }
      }
      setAvatarUrl(data.front_view_url);
    }
    setLoading(false);
  };

  const getRecommendedSize = (
    category: string, 
    availableSizes: string[],
    fitType?: string | null
  ): { size: string; confidence: 'perfect' | 'good' | 'approximate' } | null => {
    if (!measurements || availableSizes.length === 0) return null;

    const categoryKey = category.toLowerCase() as keyof typeof SIZE_CHARTS;
    const sizeChart = SIZE_CHARTS[categoryKey] || SIZE_CHARTS.tops;

    let bestMatch: string | null = null;
    let bestScore = -1;
    let matchType: 'perfect' | 'good' | 'approximate' = 'approximate';

    // Filter to only available sizes
    const sizesToCheck = Object.keys(sizeChart).filter(s => 
      availableSizes.some(as => as.toUpperCase() === s)
    );

    for (const size of sizesToCheck) {
      const ranges = sizeChart[size as keyof typeof sizeChart];
      let score = 0;
      let checks = 0;

      if ('chest' in ranges && measurements.chest_cm) {
        const [min, max] = ranges.chest as [number, number];
        if (measurements.chest_cm >= min && measurements.chest_cm <= max) score += 2;
        else if (measurements.chest_cm >= min - 4 && measurements.chest_cm <= max + 4) score += 1;
        checks++;
      }
      
      if ('waist' in ranges && measurements.waist_cm) {
        const [min, max] = ranges.waist as [number, number];
        if (measurements.waist_cm >= min && measurements.waist_cm <= max) score += 2;
        else if (measurements.waist_cm >= min - 4 && measurements.waist_cm <= max + 4) score += 1;
        checks++;
      }
      
      if ('hips' in ranges && measurements.hips_cm) {
        const [min, max] = ranges.hips as [number, number];
        if (measurements.hips_cm >= min && measurements.hips_cm <= max) score += 2;
        else if (measurements.hips_cm >= min - 4 && measurements.hips_cm <= max + 4) score += 1;
        checks++;
      }
      
      if ('shoulders' in ranges && measurements.shoulders_cm) {
        const [min, max] = ranges.shoulders as [number, number];
        if (measurements.shoulders_cm >= min && measurements.shoulders_cm <= max) score += 2;
        else if (measurements.shoulders_cm >= min - 4 && measurements.shoulders_cm <= max + 4) score += 1;
        checks++;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = size;
        
        // Determine confidence
        const maxScore = checks * 2;
        if (score === maxScore) matchType = 'perfect';
        else if (score >= maxScore * 0.75) matchType = 'good';
        else matchType = 'approximate';
      }
    }

    // Adjust for fit type
    if (bestMatch && fitType) {
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const currentIndex = sizeOrder.indexOf(bestMatch);
      
      if (fitType === 'slim' && currentIndex > 0) {
        const smallerSize = sizeOrder[currentIndex - 1];
        if (availableSizes.some(s => s.toUpperCase() === smallerSize)) {
          bestMatch = smallerSize;
          matchType = matchType === 'perfect' ? 'good' : 'approximate';
        }
      } else if (fitType === 'loose' && currentIndex < sizeOrder.length - 1) {
        const largerSize = sizeOrder[currentIndex + 1];
        if (availableSizes.some(s => s.toUpperCase() === largerSize)) {
          bestMatch = largerSize;
          matchType = matchType === 'perfect' ? 'good' : 'approximate';
        }
      }
    }

    // Return the matching available size with original casing
    if (bestMatch) {
      const matchedSize = availableSizes.find(s => s.toUpperCase() === bestMatch) || bestMatch;
      return { size: matchedSize, confidence: matchType };
    }

    // Fallback to middle size
    const middleIndex = Math.floor(availableSizes.length / 2);
    return { size: availableSizes[middleIndex], confidence: 'approximate' };
  };

  const getFitId = (): string => {
    if (!measurements) return 'GUEST';
    return `FV-${measurements.height_cm}-${measurements.chest_cm}-${measurements.waist_cm}`;
  };

  return {
    measurements,
    avatarUrl,
    loading,
    getRecommendedSize,
    getFitId,
    refresh: fetchLatestMeasurements,
  };
};
