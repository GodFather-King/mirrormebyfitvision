import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { avatarUrl, clothingName, clothingType, clothingImageUrl, viewAngle } = await req.json();
    
    console.log('Try-on clothing request received');
    console.log('Avatar URL:', avatarUrl ? `${avatarUrl.substring(0, 50)}...` : 'missing');
    console.log('Clothing name:', clothingName);
    console.log('Clothing type:', clothingType);
    console.log('Clothing image URL:', clothingImageUrl ? `${clothingImageUrl.substring(0, 50)}...` : 'missing');
    console.log('View angle:', viewAngle || 'front');

    if (!avatarUrl) {
      console.error("No avatar URL provided");
      return new Response(
        JSON.stringify({ error: "Avatar URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build message content
    const messageContent: any[] = [];

    if (clothingImageUrl) {
      // We have the actual clothing image - use it for accurate try-on
      console.log('Using actual clothing image for try-on');
      
      const viewDescription = viewAngle === 'side' 
        ? 'from a side angle, showing the profile view'
        : viewAngle === 'back'
          ? 'from behind, showing the back view'
          : 'from the front';

      messageContent.push({
        type: "text",
        text: `Virtual try-on: dress the avatar (image 1) in this ${clothingType || 'item'} (image 2), ${viewDescription}. Keep face/body/pose/angle identical. Realistic fit and draping.`
      });

      // Add avatar image first
      messageContent.push({
        type: "image_url",
        image_url: { url: avatarUrl }
      });

      // Add clothing image second
      messageContent.push({
        type: "image_url",
        image_url: { url: clothingImageUrl }
      });

    } else {
      // No clothing image - use text description
      console.log('Using text description for try-on');
      
      const clothingDescriptions: Record<string, string> = {
        tops: "a stylish fitted top",
        bottoms: "well-fitted pants/trousers",
        dresses: "an elegant dress",
        outerwear: "a fashionable jacket/coat",
        shoes: "stylish footwear",
        accessories: "fashionable accessories",
      };

      const clothingDesc = clothingDescriptions[clothingType] || `a stylish ${clothingName || clothingType || 'outfit'}`;

      messageContent.push({
        type: "text",
        text: `Virtual try-on: dress this avatar in ${clothingDesc}. Keep face/body identical. Realistic fit.`
      });

      messageContent.push({
        type: "image_url",
        image_url: { url: avatarUrl }
      });
    }

    console.log('Calling AI gateway...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"]
      }),
    });

    console.log("AI Gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits needed. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to apply clothing", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    console.log("Has generated image:", !!generatedImage);

    if (!generatedImage) {
      console.error("No image generated in response");
      console.error("Text response:", textResponse);
      return new Response(
        JSON.stringify({ 
          error: "Could not apply clothing", 
          details: textResponse || "The AI did not return an image"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Virtual try-on completed successfully");

    return new Response(
      JSON.stringify({ 
        tryOnUrl: generatedImage,
        message: textResponse || `${clothingName} applied successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("try-on-clothing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
