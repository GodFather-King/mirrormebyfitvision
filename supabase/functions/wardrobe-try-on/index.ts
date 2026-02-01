import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { avatarUrl, clothingName, clothingType, clothingImageUrl, clothingItems } = await req.json();

    console.log('Wardrobe try-on request received');
    console.log('Avatar URL:', avatarUrl ? `${avatarUrl.substring(0, 50)}...` : 'missing');
    console.log('Clothing name:', clothingName);
    console.log('Clothing type:', clothingType);
    console.log('Clothing image URL:', clothingImageUrl ? `${clothingImageUrl.substring(0, 50)}...` : 'missing');

    if (!avatarUrl) {
      console.error('No avatar URL provided');
      return new Response(
        JSON.stringify({ error: 'Avatar URL is required. Please create an avatar first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate avatar URL is not a placeholder
    if (avatarUrl.includes('placeholder') || avatarUrl.includes('via.placeholder')) {
      console.error('Placeholder avatar URL detected');
      return new Response(
        JSON.stringify({ error: 'Please create a real avatar by uploading your photo first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build message content based on whether we have a single item or multiple items
    const messageContent: any[] = [];

    if (clothingImageUrl) {
      // Single item try-on with actual clothing image
      console.log('Single item try-on with clothing image');
      
      messageContent.push({
        type: 'text',
        text: `Apply this ${clothingType || 'clothing item'} (${clothingName || 'item'}) onto this person's avatar.

CRITICAL REQUIREMENTS:
- The person/avatar in the first image is the model - keep their face, body, and pose EXACTLY the same
- The clothing item in the second image should be overlaid/applied to the model
- Fit the clothing naturally to the person's body proportions
- Show realistic fabric draping, shadows, and folds
- Make it look like a professional virtual try-on result
- Maintain the avatar's original style and lighting
- The clothing must look like it's actually being worn, not just pasted on`
      });

      // Add avatar image first
      messageContent.push({
        type: 'image_url',
        image_url: { url: avatarUrl }
      });

      // Add clothing image second
      messageContent.push({
        type: 'image_url',
        image_url: { url: clothingImageUrl }
      });

    } else if (clothingItems && clothingItems.length > 0) {
      // Multiple items (legacy format)
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
- Keep the person's face and pose unchanged`
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
      // No clothing image - text-based description only
      console.log('Text-based try-on (no clothing image)');
      
      messageContent.push({
        type: 'text',
        text: `Dress this avatar in a ${clothingName || clothingType || 'stylish outfit'}.

Requirements:
- Keep the avatar's face, body shape, and proportions exactly the same
- Add the clothing item realistically fitted to their body
- The clothing should look natural with proper shadows and folds
- Maintain the same style and lighting
- Show how the garment fits on their specific body type`
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
    console.log('AI response received');

    const tryOnUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    console.log('Has generated image:', !!tryOnUrl);

    if (!tryOnUrl) {
      console.error('No try-on image generated');
      console.error('Text response:', textResponse);
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
