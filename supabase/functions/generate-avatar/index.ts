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

    const prompt = `You are a photorealistic digital twin engine. Recreate the EXACT person in this full-body photo as a hyper-realistic photograph — indistinguishable from a real DSLR shot. This is NOT a stylized avatar, NOT a 3D render, NOT a CGI character.

CRITICAL ANALYSIS STEPS — perform ALL before generating the image:
1. SKIN ANALYSIS: Identify exact skin tone, texture (visible pores, freckles, moles, scars, natural asymmetry), undertone. Preserve every real skin detail.
2. BODY ANALYSIS: Proportions — shoulder-to-hip ratio, torso-to-leg ratio, arm length, body shape. Match true body mass and posture.
3. FACIAL STRUCTURE: Face shape, jawline, cheekbones, nose, eye shape and color (iris detail, catchlights), eyebrow shape, lip shape, natural asymmetry, teeth if visible.
4. HAIR ANALYSIS: Style, length, color (highlights/roots/grays), volume, parting, individual flyaway strands.
5. CLOTHING DETECTION: Every visible garment — type, color, pattern, fabric texture, weave, wrinkles, fit, layering.

PHOTOREALISM REQUIREMENTS (non-negotiable):
- Output must look like a REAL photograph taken with a full-frame DSLR (85mm lens, f/2.8, ISO 200) — NOT a render, NOT a video-game character, NOT MetaHuman, NOT plastic-looking.
- Preserve natural skin imperfections: pores, subtle blemishes, fine lines, peach fuzz, subsurface scattering, natural oiliness/matte variation.
- Eyes: realistic iris texture, catchlights, moisture, subtle sclera veins, natural eyelash density.
- Hair: individual strands, realistic sheen, frizz, natural fall — no helmet-hair or clumped render look.
- Clothing fabric: real weave, wrinkles, drape, micro-shadows.
- The person MUST be immediately recognizable as themselves — same face, same identity. NO beautification, NO idealization, NO "AI face" symmetry, NO skin smoothing.
- Preserve exact skin tone (do NOT lighten), body proportions, and clothing colors.
- Background: neutral photography studio backdrop (soft grey seamless), professional 3-point lighting.
- Full body head to toe, same natural pose as original.
- Realistic contact shadows and subtle ambient occlusion.

FORBIDDEN: cartoon, anime, illustration, painting, stylization, plastic skin, wax-figure look, overly smooth skin, symmetrical "beauty filter" face, uncanny-valley CGI, MetaHuman/Unreal Engine aesthetic, video-game character, doll-like appearance.

${heightCm ? `The person's actual height is ${heightCm}cm. Use this for all proportional measurements.` : 'Estimate height from visible proportions.'}

After generating the image, output measurements in this EXACT format on a single line:
MEASUREMENTS_JSON:{"height_cm":XXX,"chest_cm":XX,"waist_cm":XX,"hips_cm":XX,"shoulders_cm":XX,"inseam_cm":XX,"body_type":"slim|average|athletic|curvy|plus","skin_tone":"description","hair_color":"description","detected_clothing":[{"type":"shirt","color":"blue","pattern":"solid"}]}

Generate the hyper-realistic photograph now.`;

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
