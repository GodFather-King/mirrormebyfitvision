import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatarUrl, clothingItems } = await req.json();

    if (!avatarUrl) {
      console.error('No avatar URL provided');
      return new Response(
        JSON.stringify({ error: 'Avatar URL is required. Please create an avatar first by uploading a photo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate avatar URL is not a placeholder
    if (avatarUrl.includes('placeholder') || avatarUrl.includes('via.placeholder')) {
      console.error('Placeholder avatar URL detected:', avatarUrl);
      return new Response(
        JSON.stringify({ error: 'Please create a real avatar by uploading your photo first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clothingItems || clothingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one clothing item is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Applying ${clothingItems.length} items to avatar`);
    console.log('Avatar URL type:', avatarUrl.startsWith('data:') ? 'base64' : 'hosted URL');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the clothing description
    const clothingDescription = clothingItems.map((item: any) => 
      `${item.category}: ${item.name} (${item.color || 'as shown'})`
    ).join(', ');

    console.log('Clothing description:', clothingDescription);

    // Build the message content with avatar and all clothing items
    const messageContent: any[] = [
      {
        type: 'text',
        text: `Apply these clothing items to this person/avatar with realistic fit and drape: ${clothingDescription}. 
        
Requirements:
- Fit the clothing naturally to the body proportions
- Preserve the original color and texture of each clothing item
- Show realistic fabric draping and folds
- Maintain proper layering (e.g., shirt under jacket)
- Keep the person's face and pose unchanged
- Make it look like a professional fashion photo`
      },
      {
        type: 'image_url',
        image_url: { url: avatarUrl }
      }
    ];

    // Add each clothing item image - prefer original URL over base64 processed image
    for (const item of clothingItems) {
      // Use original image URL if available (more reliable than base64)
      const imageUrl = item.originalImageUrl || item.processedImageUrl;
      if (imageUrl) {
        console.log(`Adding clothing image: ${item.name}, URL type: ${imageUrl.startsWith('data:') ? 'base64' : 'hosted'}`);
        messageContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      }
    }

    console.log('Calling AI gateway...');

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
      throw new Error(`AI try-on failed: ${status}`);
    }

    const data = await response.json();
    console.log('Try-on response received');

    const tryOnUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!tryOnUrl) {
      console.error('No try-on image generated');
      return new Response(
        JSON.stringify({ error: 'Could not generate try-on image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Wardrobe try-on successful');

    return new Response(
      JSON.stringify({ tryOnUrl }),
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
