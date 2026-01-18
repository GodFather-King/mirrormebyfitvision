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
    const { imageUrl, view } = await req.json();
    
    if (!imageUrl) {
      console.error("No image URL provided");
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${view} view of 3D avatar...`);

    const viewPrompts: Record<string, string> = {
      front: `Transform this person into a high-quality 3D rendered avatar shown from the FRONT view.

Requirements:
- Create a stylized 3D CGI character that looks like a high-end video game or Pixar-style model
- Preserve their exact facial features, hair style, skin tone, body shape and proportions
- FRONT facing pose - looking directly at camera
- Full body visible from head to feet
- Professional 3D render with soft ambient lighting
- Subtle cyan/blue rim lighting on edges for a futuristic tech aesthetic
- Dark gradient background with slight vignette
- Smooth 3D surfaces with realistic cloth simulation on any clothing
- High detail on face and hands

Generate the front view 3D avatar now.`,

      side: `Based on this front-facing photo, generate a 3D rendered avatar showing the SIDE/PROFILE view (90 degrees rotated).

Requirements:
- Create the same 3D CGI character but rotated to show their RIGHT SIDE profile
- Maintain exact body proportions, height, and build from the front photo
- Same stylized 3D Pixar/game character aesthetic
- Profile view showing the side of their face, body silhouette
- Full body visible from head to feet in side view
- Same lighting setup: soft ambient with cyan/blue rim light
- Same dark gradient background
- Accurate 3D body depth and contours visible from side angle
- Clothing should wrap realistically around the body in 3D

Generate the side profile view of this 3D avatar now.`,

      back: `Based on this front-facing photo, generate a 3D rendered avatar showing the BACK view (180 degrees rotated).

Requirements:
- Create the same 3D CGI character but rotated to show their BACK
- Show the back of their head, hair, shoulders, back, and full body from behind
- Maintain exact body proportions and build from the front photo
- Same stylized 3D Pixar/game character aesthetic
- Full body visible from head to feet from behind
- Same lighting setup: soft ambient with cyan/blue rim light on edges
- Same dark gradient background
- Back details: hair from behind, shoulder blades, spine contour, clothing back view
- All clothing and accessories should be visible from the back angle

Generate the back view of this 3D avatar now.`
    };

    const prompt = viewPrompts[view] || viewPrompts.front;

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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
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
        JSON.stringify({ error: "Failed to generate view", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image generated for view:", view);
      return new Response(
        JSON.stringify({ error: "Could not generate this view" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${view} view generated successfully`);

    return new Response(
      JSON.stringify({ viewUrl: generatedImage, view }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-avatar-views error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
