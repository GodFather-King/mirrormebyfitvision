import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const mimeToExt = (mime: string | null | undefined) => {
  switch ((mime || "").toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
};

async function resolveImageBytes(imageUrl: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const contentType = dataUrlMatch[1];
    const base64 = dataUrlMatch[2];
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { bytes, contentType };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType };
}

async function uploadToAvatarsBucket(params: {
  imageUrl: string;
  prefix: string;
  userId?: string | null;
}): Promise<string> {
  const { imageUrl, prefix, userId } = params;

  if (!supabaseAdmin) {
    // No storage client available; fall back to returning the original URL.
    return imageUrl;
  }

  const { bytes, contentType } = await resolveImageBytes(imageUrl);
  const ext = mimeToExt(contentType);
  const folder = userId || "anon";
  const objectPath = `${folder}/${prefix}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("avatars")
    .upload(objectPath, bytes, { contentType, upsert: true });

  if (error) {
    console.error("Failed to upload avatar image to storage:", error);
    return imageUrl;
  }

  const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(objectPath);
  return data.publicUrl;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, heightCm } = await req.json();
    
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

    console.log("Starting 3D avatar generation with body measurement extraction...");
    console.log("Image URL length:", imageUrl.length);
    console.log("User-provided height:", heightCm || "not provided");

    // Best-effort: get user id for storage foldering (but still works anonymously)
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : authHeader;
      if (supabaseAdmin && token) {
        const { data } = await supabaseAdmin.auth.getUser(token);
        userId = data.user?.id ?? null;
      }
    } catch {
      // ignore
    }

    // Use the image generation model to create a 3D avatar version
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transform this photo into a photorealistic 3D digital human render AND analyze body proportions.

AVATAR REQUIREMENTS:
- Create a highly realistic 3D digital human version of this person — NOT a cartoon, NOT stylized, NOT Pixar-style
- This must look like a photorealistic 3D scan or a high-end digital double used in film VFX
- Preserve EXACT facial features, skin texture, skin tone, hair style, hair color, and body shape
- The result should be indistinguishable from a real photo but with clean 3D studio lighting
- Use professional 3D portrait lighting: soft key light, subtle fill, and a gentle rim/edge light
- Clean, neutral dark gradient background
- Full body view, same pose as the original photo
- Maintain exact clothing, accessories, and proportions from the original
- Quality level: Unreal Engine MetaHuman / high-end 3D body scan quality
- The person viewing this should immediately recognize themselves

BODY MEASUREMENT ANALYSIS:
Based on the person's visible proportions in the photo${heightCm ? ` and their provided height of ${heightCm}cm` : ''}, estimate realistic body measurements.
${heightCm ? `Use ${heightCm}cm as the reference height to calculate proportional measurements.` : 'Estimate height based on typical adult proportions and visible cues.'}

After generating the avatar, provide a JSON measurement analysis in this exact format:
MEASUREMENTS_JSON:{"height_cm":XXX,"chest_cm":XX,"waist_cm":XX,"hips_cm":XX,"shoulders_cm":XX,"inseam_cm":XX,"body_type":"slim|average|athletic|curvy"}

Generate the photorealistic 3D avatar now.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
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
        JSON.stringify({ error: "Failed to generate avatar", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response keys:", Object.keys(data));
    
    // Extract the generated image and text from the response
    // The response may return images in multiple formats depending on the model:
    // 1. As inline_data in content parts array
    // 2. As a separate images array
    // 3. As image_url in content parts
    const message = data.choices?.[0]?.message;
    let generatedImage: string | null = null;
    let textResponse = "";

    // Check if content is an array of parts (multimodal response)
    if (Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part.type === "text") {
          textResponse += part.text || "";
        } else if (part.type === "image_url") {
          generatedImage = part.image_url?.url || null;
        } else if (part.inline_data) {
          generatedImage = `data:${part.inline_data.mime_type || "image/png"};base64,${part.inline_data.data}`;
        }
      }
    } else {
      textResponse = message?.content || "";
    }

    // Fallback: check images array
    if (!generatedImage) {
      generatedImage = message?.images?.[0]?.image_url?.url || null;
    }

    console.log("Has generated image:", !!generatedImage);
    console.log("Text response:", textResponse?.substring(0, 500));

    // Extract measurements from the text response
    let measurements = null;
    const measurementsMatch = textResponse.match(/MEASUREMENTS_JSON:\s*(\{[^}]+\})/);
    if (measurementsMatch) {
      try {
        measurements = JSON.parse(measurementsMatch[1]);
        console.log("Extracted measurements:", measurements);
      } catch (e) {
        console.error("Failed to parse measurements JSON:", e);
      }
    }

    // If no measurements extracted, generate realistic defaults based on height
    if (!measurements) {
      const estimatedHeight = heightCm || 170;
      measurements = {
        height_cm: estimatedHeight,
        chest_cm: Math.round(estimatedHeight * 0.54),
        waist_cm: Math.round(estimatedHeight * 0.46),
        hips_cm: Math.round(estimatedHeight * 0.56),
        shoulders_cm: Math.round(estimatedHeight * 0.26),
        inseam_cm: Math.round(estimatedHeight * 0.47),
        body_type: "average"
      };
      console.log("Using estimated measurements:", measurements);
    }

    if (!generatedImage) {
      console.error("No image generated in response");
      return new Response(
        JSON.stringify({ 
          error: "No avatar image was generated", 
          details: textResponse || "The AI did not return an image"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("3D Avatar generated successfully with measurements");

    // CRITICAL: The AI commonly returns a large `data:` URL which cannot be reliably persisted
    // in localStorage or saved/transferred efficiently. Upload the image to file storage and
    // return a permanent public URL.
    let persistedAvatarUrl = generatedImage;
    try {
      persistedAvatarUrl = await uploadToAvatarsBucket({
        imageUrl: generatedImage,
        prefix: "avatar",
        userId,
      });
    } catch (e) {
      console.error("Failed to persist avatar image; falling back to original URL:", e);
    }

    return new Response(
      JSON.stringify({ 
        avatarUrl: persistedAvatarUrl,
        measurements: measurements,
        message: "3D Avatar generated with body measurements"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-avatar error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
