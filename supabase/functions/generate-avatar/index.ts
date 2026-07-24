import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    default: return "png";
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
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
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
  if (!supabaseAdmin) return imageUrl;

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, heightCm } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Starting digital twin generation...");

    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : authHeader;
      if (supabaseAdmin && token) {
        const { data } = await supabaseAdmin.auth.getUser(token);
        userId = data.user?.id ?? null;
      }
    } catch { /* ignore */ }

    const prompt = `A real photograph shot on a professional full-frame DSLR camera (Canon EOS R5, 85mm f/1.8 lens, ISO 200) of the EXACT person shown in the reference photo. This is a REAL PHOTOGRAPH of a REAL HUMAN BEING — indistinguishable from a candid editorial fashion portrait. It is NOT an avatar, NOT a 3D render, NOT CGI, NOT MetaHuman, NOT Unreal Engine, NOT Pixar, NOT anime, NOT illustrated, NOT AI-looking.

IDENTITY LOCK (critical — the output must be recognizably the SAME person):
- Same face shape, jawline, cheekbones, nose, eye shape and iris color, eyebrow shape, lip shape, natural facial asymmetry, teeth if visible.
- Same skin tone (do NOT lighten, do NOT beautify, do NOT smooth), same freckles/moles/scars/blemishes.
- Same hair — style, length, color (including highlights, roots, grays), volume, parting, flyaways.
- Same body proportions — shoulder-to-hip ratio, torso-to-leg ratio, arm length, true body mass and shape.
- Same clothing — every garment's type, color, pattern, fabric weave, wrinkles, fit and layering preserved exactly.

REAL-HUMAN PHOTOREALISM (non-negotiable):
- Authentic skin with visible pores, fine hairs (peach fuzz), subsurface scattering, natural oil/matte variation, subtle blemishes, real skin micro-texture. NO plastic skin. NO airbrushing. NO "beauty filter" symmetry.
- Eyes: realistic iris texture with fibers and depth, natural catchlights, moisture, faint sclera veins, individual eyelashes of varied length.
- Hair: individual strands with realistic sheen, frizz and natural fall — no clumped "render" hair, no helmet hair.
- Clothing: real fabric weave, natural wrinkles, drape and micro-shadows.
- Realistic contact shadows, subtle ambient occlusion, natural depth cues.

SHOT & STYLE:
- Full body, head to toe, same natural pose as the reference.
- Vertical 3:4 portrait framing, sharp focus on the person, shallow depth of field (soft bokeh background).
- Setting: clean neutral photography backdrop (soft seamless paper) OR a soft daylight studio — no props, no text, no logos.
- Lighting: soft natural key light with gentle rim highlight, magazine-quality color grading (Vogue / Elle editorial mood).

ABSOLUTELY FORBIDDEN: 3D render, CGI, avatar, MetaHuman, Unreal Engine, video-game character, doll, wax figure, plastic skin, airbrushed skin, symmetrical AI-beauty face, uncanny valley, cartoon, anime, illustration, painting, stylization, watermarks, text, brand logos.

${heightCm ? `The person's actual height is ${heightCm}cm. Use this for all proportional measurements.` : 'Estimate height from visible proportions.'}

After generating the image, output measurements in this EXACT format on a single line:
MEASUREMENTS_JSON:{"height_cm":XXX,"chest_cm":XX,"waist_cm":XX,"hips_cm":XX,"shoulders_cm":XX,"inseam_cm":XX,"body_type":"slim|average|athletic|curvy|plus","skin_tone":"description","hair_color":"description","detected_clothing":[{"type":"shirt","color":"blue","pattern":"solid"}]}

Generate the real-photograph portrait now.`;


    const callModel = async (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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

    // Highest-quality image model, fall back if unavailable
    let response = await callModel("google/gemini-3-pro-image");
    if (!response.ok && response.status !== 429 && response.status !== 402) {
      console.warn("Pro image model failed, falling back to flash image:", response.status);
      response = await callModel("google/gemini-3.1-flash-image");
    }

    console.log("AI Gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Failed to generate avatar", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    let generatedImage: string | null = null;
    let textResponse = "";

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

    if (!generatedImage) {
      generatedImage = message?.images?.[0]?.image_url?.url || null;
    }

    console.log("Has generated image:", !!generatedImage);
    console.log("Text response:", textResponse?.substring(0, 500));

    // Extract measurements — try to parse a broader JSON blob
    let measurements = null;
    const measurementsMatch = textResponse.match(/MEASUREMENTS_JSON:\s*(\{[\s\S]*?\}(?:\][\s\S]*?\})?)/);
    if (measurementsMatch) {
      try {
        measurements = JSON.parse(measurementsMatch[1]);
        console.log("Extracted measurements:", measurements);
      } catch (e) {
        // Try simpler match
        const simpleMatch = textResponse.match(/MEASUREMENTS_JSON:\s*(\{[^}]+\})/);
        if (simpleMatch) {
          try { measurements = JSON.parse(simpleMatch[1]); } catch { /* ignore */ }
        }
        console.error("Failed to parse measurements JSON:", e);
      }
    }

    if (!measurements) {
      const estimatedHeight = heightCm || 170;
      measurements = {
        height_cm: estimatedHeight,
        chest_cm: Math.round(estimatedHeight * 0.54),
        waist_cm: Math.round(estimatedHeight * 0.46),
        hips_cm: Math.round(estimatedHeight * 0.56),
        shoulders_cm: Math.round(estimatedHeight * 0.26),
        inseam_cm: Math.round(estimatedHeight * 0.47),
        body_type: "average",
        skin_tone: "not detected",
        hair_color: "not detected",
        detected_clothing: []
      };
    }

    if (!generatedImage) {
      return new Response(
        JSON.stringify({ error: "No avatar image was generated", details: textResponse || "The AI did not return an image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let persistedAvatarUrl = generatedImage;
    try {
      persistedAvatarUrl = await uploadToAvatarsBucket({ imageUrl: generatedImage, prefix: "avatar", userId });
    } catch (e) {
      console.error("Failed to persist avatar image:", e);
    }

    return new Response(
      JSON.stringify({ 
        avatarUrl: persistedAvatarUrl,
        measurements,
        message: "Digital twin generated with body analysis"
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
