import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClothingMeasurements {
  chest_width_cm?: number | null;
  waist_width_cm?: number | null;
  hip_width_cm?: number | null;
  sleeve_length_cm?: number | null;
  shoulder_width_cm?: number | null;
  garment_length_cm?: number | null;
  fit_type?: string;
}

interface BodyMeasurements {
  height_cm?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  shoulders_cm?: number;
  inseam_cm?: number;
  body_type?: string;
}

function buildFitInstructions(
  clothing: ClothingMeasurements | undefined,
  body: BodyMeasurements | undefined
): string {
  if (!clothing && !body) return '';

  const fitType = clothing?.fit_type || 'regular';
  const lines: string[] = [];

  lines.push(`\nFIT STYLE: ${fitType.toUpperCase()}`);

  if (fitType === 'oversized') {
    lines.push('- The garment should appear LOOSE and BAGGY on the body.');
    lines.push('- Show visible extra fabric, drape, and space between the clothing and the body.');
    lines.push('- Sleeves and hem should hang loosely, not cling to the skin.');
    lines.push('- The silhouette should be wider and boxier than the body shape.');
  } else if (fitType === 'tight') {
    lines.push('- The garment should appear FORM-FITTING and tight against the body.');
    lines.push('- Show the clothing hugging every curve and contour closely.');
    lines.push('- Minimal loose fabric — the clothing follows the body shape tightly.');
  } else {
    lines.push('- The garment should have a REGULAR fit — not too tight, not too loose.');
    lines.push('- Show a comfortable, natural drape with slight ease around the body.');
  }

  // Add specific measurement comparisons if both are available
  if (clothing && body) {
    if (clothing.chest_width_cm && body.chest_cm) {
      const diff = clothing.chest_width_cm - body.chest_cm;
      if (diff > 10) {
        lines.push(`- Chest: Garment is ${diff.toFixed(0)}cm wider than body — show significant looseness around the torso.`);
      } else if (diff > 4) {
        lines.push(`- Chest: Garment is ${diff.toFixed(0)}cm wider — show comfortable ease around the chest.`);
      } else if (diff < -2) {
        lines.push(`- Chest: Garment is ${Math.abs(diff).toFixed(0)}cm narrower — show it stretching tight across the chest.`);
      }
    }

    if (clothing.waist_width_cm && body.waist_cm) {
      const diff = clothing.waist_width_cm - body.waist_cm;
      if (diff > 10) {
        lines.push(`- Waist: Garment is ${diff.toFixed(0)}cm wider — show fabric gathering and looseness at the waist.`);
      } else if (diff < -2) {
        lines.push(`- Waist: Garment is ${Math.abs(diff).toFixed(0)}cm narrower — show it pulled tight at the waist.`);
      }
    }

    if (clothing.hip_width_cm && body.hips_cm) {
      const diff = clothing.hip_width_cm - body.hips_cm;
      if (diff > 8) {
        lines.push(`- Hips: Garment is ${diff.toFixed(0)}cm wider — show loose drape around the hips.`);
      } else if (diff < -2) {
        lines.push(`- Hips: Garment is tight around the hips.`);
      }
    }

    if (clothing.shoulder_width_cm && body.shoulders_cm) {
      const diff = clothing.shoulder_width_cm - body.shoulders_cm;
      if (diff > 5) {
        lines.push(`- Shoulders: Garment is ${diff.toFixed(0)}cm wider — show dropped or extended shoulder seams.`);
      } else if (diff < -2) {
        lines.push(`- Shoulders: Garment is narrower — show tight shoulder seams pulled inward.`);
      }
    }

    if (clothing.garment_length_cm && body.height_cm) {
      const ratio = clothing.garment_length_cm / body.height_cm;
      if (ratio > 0.45) {
        lines.push('- Length: This is a long garment — show it extending well past the waist.');
      } else if (ratio < 0.3) {
        lines.push('- Length: This is a cropped garment — show it ending above the natural waist.');
      }
    }
  }

  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      avatarUrl, clothingName, clothingType, clothingImageUrl, clothingItems,
      clothingMeasurements, bodyMeasurements
    } = await req.json();

    console.log('Wardrobe try-on request received');
    console.log('Avatar URL:', avatarUrl ? `${avatarUrl.substring(0, 50)}...` : 'missing');
    console.log('Clothing name:', clothingName);
    console.log('Clothing type:', clothingType);
    console.log('Fit type:', clothingMeasurements?.fit_type || 'not provided');

    if (!avatarUrl) {
      return new Response(
        JSON.stringify({ error: 'Avatar URL is required. Please create an avatar first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (avatarUrl.includes('placeholder') || avatarUrl.includes('via.placeholder')) {
      return new Response(
        JSON.stringify({ error: 'Please create a real avatar by uploading your photo first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const fitInstructions = buildFitInstructions(clothingMeasurements, bodyMeasurements);

    const messageContent: any[] = [];

    if (clothingImageUrl) {
      console.log('Single item try-on with clothing image');
      
      messageContent.push({
        type: 'text',
        text: `Apply this ${clothingType || 'clothing item'} (${clothingName || 'item'}) onto this person's avatar.

CRITICAL REQUIREMENTS:
- The person/avatar in the first image is the model - keep their face, body, and pose EXACTLY the same
- The clothing item in the second image should be overlaid/applied to the model
- Show realistic fabric draping, shadows, and folds
- Maintain the avatar's original style and lighting
- The clothing must look like it's actually being worn, not just pasted on
${fitInstructions}

IMPORTANT: Follow the fit instructions above precisely. The visual result must reflect whether the garment is loose, regular, or tight on this specific body.`
      });

      messageContent.push({
        type: 'image_url',
        image_url: { url: avatarUrl }
      });

      messageContent.push({
        type: 'image_url',
        image_url: { url: clothingImageUrl }
      });

    } else if (clothingItems && clothingItems.length > 0) {
      console.log(`Multiple items try-on: ${clothingItems.length} items`);
      
      const clothingDescription = clothingItems.map((item: any) => 
        `${item.category}: ${item.name} (${item.color || 'as shown'})`
      ).join(', ');

      messageContent.push({
        type: 'text',
        text: `Apply these clothing items to this person/avatar: ${clothingDescription}.

Requirements:
- Fit the clothing naturally to the body proportions
- Preserve the original color and texture of each clothing item
- Show realistic fabric draping and folds
- Maintain proper layering
- Keep the person's face and pose unchanged
${fitInstructions}`
      });

      messageContent.push({
        type: 'image_url',
        image_url: { url: avatarUrl }
      });

      for (const item of clothingItems) {
        const imgUrl = item.originalImageUrl || item.processedImageUrl;
        if (imgUrl) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          });
        }
      }

    } else {
      messageContent.push({
        type: 'text',
        text: `Dress this avatar in a ${clothingName || clothingType || 'stylish outfit'}.

Requirements:
- Keep the avatar's face, body shape, and proportions exactly the same
- Add the clothing item realistically fitted to their body
- The clothing should look natural with proper shadows and folds
- Maintain the same style and lighting
${fitInstructions}`
      });

      messageContent.push({
        type: 'image_url',
        image_url: { url: avatarUrl }
      });
    }

    console.log('Calling AI gateway with', messageContent.length, 'content items...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: messageContent }],
        modalities: ['image', 'text']
      })
    });

    console.log('AI Gateway response status:', response.status);

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error('AI gateway error:', status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits needed. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI try-on failed: ${status} - ${errorText}`);
    }

    const data = await response.json();
    const tryOnUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!tryOnUrl) {
      console.error('No try-on image generated');
      return new Response(
        JSON.stringify({ error: 'Could not generate try-on image', details: textResponse }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Wardrobe try-on successful');

    return new Response(
      JSON.stringify({ tryOnUrl, message: textResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wardrobe try-on error:', error);
    const message = error instanceof Error ? error.message : 'Failed to apply clothing';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
