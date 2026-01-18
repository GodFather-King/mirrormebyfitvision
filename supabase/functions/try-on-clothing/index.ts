import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatarUrl, clothingName, clothingType } = await req.json();
    
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

    console.log("Starting virtual try-on for:", clothingName);
    console.log("Clothing type:", clothingType);

    const clothingDescriptions: Record<string, string> = {
      blazer: "a fitted black formal blazer jacket with subtle lapels, professional business style",
      tshirt: "a clean white crew-neck t-shirt, casual fit, cotton fabric",
      dress: "an elegant navy blue midi dress, fitted silhouette, sophisticated style",
    };

    const clothingDesc = clothingDescriptions[clothingType] || `a stylish ${clothingName}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `This is a 3D avatar. Dress this avatar in ${clothingDesc}.

Requirements:
- Keep the avatar's face, body shape, and proportions exactly the same
- Add the clothing item realistically fitted to their body
- The clothing should look natural on the avatar with proper shadows and folds
- Maintain the same 3D rendered style and lighting
- Keep the same dark background with cyan/blue rim lighting
- Show how the garment fits on their specific body type
- The result should look like a virtual fitting room preview

Apply the clothing now.`
              },
              {
                type: "image_url",
                image_url: {
                  url: avatarUrl
                }
              }
            ]
          }
        ],
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
