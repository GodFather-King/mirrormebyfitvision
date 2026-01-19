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
    const { imageUrl, category, name } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing clothing: ${name}, category: ${category}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to process the clothing image - extract it cleanly and make it 3D-ready
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Process this clothing image for virtual try-on. Extract the ${category || 'clothing'} item cleanly with a transparent or solid neutral background. Enhance the colors and textures to look realistic. Make sure the item is well-lit and clearly visible, suitable for overlaying on a 3D avatar. Keep the original color and style of the garment.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const status = response.status;
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
      const errorText = await response.text();
      console.error('AI gateway error:', status, errorText);
      throw new Error(`AI processing failed: ${status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the processed image
    const processedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!processedImageUrl) {
      console.log('No processed image returned, using original');
      return new Response(
        JSON.stringify({ 
          processedImageUrl: imageUrl,
          message: 'Using original image'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Clothing processed successfully');

    return new Response(
      JSON.stringify({ 
        processedImageUrl,
        message: 'Clothing processed for 3D try-on'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process clothing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process clothing';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
