// Generates AI fashion campaign images for a brand using Lovable AI Gateway.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ReqBody {
  brand_id: string;
  name?: string;
  garment_image_url: string;        // legacy single-image field
  garment_image_urls?: string[];    // preferred multi-garment field
  model_preset: Record<string, unknown>;
  scene_preset: string;
  scene_prompt: string;
  aesthetic: string;
  prompts: string[];                // 4 prompts, one per variation
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'AI service not configured' }, 500);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as ReqBody;
    const garmentUrls = (body.garment_image_urls && body.garment_image_urls.length
      ? body.garment_image_urls
      : body.garment_image_url ? [body.garment_image_url] : []);
    if (!body.brand_id || garmentUrls.length === 0 || !body.prompts?.length) {
      return json({ error: 'Missing required fields' }, 400);
    }

    // Verify brand ownership OR admin role. Admins can use the studio on any
    // brand for testing / support, regardless of ai_studio_enabled.
    const { data: brand, error: brandErr } = await admin
      .from('brands')
      .select('id, ai_studio_enabled')
      .eq('id', body.brand_id)
      .maybeSingle();
    if (brandErr || !brand) return json({ error: 'Brand not found' }, 404);

    const { data: ownership } = await admin
      .from('brand_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('brand_id', body.brand_id)
      .maybeSingle();
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (!ownership && !isAdmin) return json({ error: 'Not authorized for this brand' }, 403);
    if (!brand.ai_studio_enabled && !isAdmin) return json({ error: 'AI Fashion Studio not enabled for this brand' }, 403);

    // Create campaign row
    const { data: campaign, error: campaignErr } = await admin
      .from('ai_campaigns')
      .insert({
        brand_id: body.brand_id,
        user_id: userId,
        name: body.name ?? 'Untitled Campaign',
        garment_image_url: garmentUrls[0],
        model_preset: body.model_preset ?? {},
        scene_preset: body.scene_preset,
        aesthetic: body.aesthetic,
        status: 'pending',
      })
      .select()
      .single();
    if (campaignErr || !campaign) return json({ error: campaignErr?.message ?? 'Insert failed' }, 500);

    // Convert every garment URL to base64 (memory rule: no external URLs to AI)
    const garmentBase64s: string[] = [];
    for (const url of garmentUrls) {
      const resp = await fetch(url);
      if (!resp.ok) return json({ error: 'Could not load garment image' }, 400);
      const buf = new Uint8Array(await resp.arrayBuffer());
      const mime = resp.headers.get('content-type') ?? 'image/jpeg';
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      garmentBase64s.push(`data:${mime};base64,${btoa(bin)}`);
    }

    const results: { url: string; storage_path: string; index: number }[] = [];

    for (let i = 0; i < body.prompts.length; i++) {
      const prompt = body.prompts[i];
      try {
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  ...garmentBase64s.map((b64) => ({ type: 'image_url', image_url: { url: b64 } })),
                ],
              },
            ],
            modalities: ['image', 'text'],
          }),
        });

        if (aiRes.status === 429) {
          await admin.from('ai_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
          return json({ error: 'AI is busy — please try again in a moment.' }, 429);
        }
        if (aiRes.status === 402) {
          await admin.from('ai_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
          return json({ error: 'AI credits exhausted. Top up in workspace settings.' }, 402);
        }
        if (!aiRes.ok) {
          console.error('AI gateway error', aiRes.status, await aiRes.text());
          continue;
        }

        const aiJson = await aiRes.json();
        const dataUrl: string | undefined = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrl?.startsWith('data:')) continue;

        // Decode and upload to storage
        const [meta, b64] = dataUrl.split(',');
        const outMime = meta.match(/data:(.*?);/)?.[1] ?? 'image/png';
        const ext = outMime.includes('jpeg') ? 'jpg' : 'png';
        const binStr = atob(b64);
        const bytes = new Uint8Array(binStr.length);
        for (let j = 0; j < binStr.length; j++) bytes[j] = binStr.charCodeAt(j);

        const path = `${userId}/campaigns/${campaign.id}/v${i}.${ext}`;
        const { error: upErr } = await admin.storage.from('ai-studio').upload(path, bytes, {
          contentType: outMime,
          upsert: true,
        });
        if (upErr) {
          console.error('Upload error', upErr);
          continue;
        }
        const { data: pub } = admin.storage.from('ai-studio').getPublicUrl(path);
        results.push({ url: pub.publicUrl, storage_path: path, index: i });

        await admin.from('ai_campaign_images').insert({
          campaign_id: campaign.id,
          image_url: pub.publicUrl,
          storage_path: path,
          variation_index: i,
        });
      } catch (e) {
        console.error('Variation failed', i, e);
      }
    }

    const finalStatus = results.length > 0 ? 'ready' : 'failed';
    await admin.from('ai_campaigns').update({ status: finalStatus }).eq('id', campaign.id);

    if (!results.length) return json({ error: 'No images could be generated' }, 500);

    return json({ campaign_id: campaign.id, images: results });
  } catch (e) {
    console.error('generate-ai-campaign fatal', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
