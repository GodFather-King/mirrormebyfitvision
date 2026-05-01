// Import a list of products from an external brand website using Lovable AI.
// Two modes:
//   - mode: 'preview' -> fetches the URL, asks Gemini to extract products, returns array (no DB write)
//   - mode: 'commit'  -> inserts the provided products into brand_items for the given brand
//
// Requires: caller must be authenticated AND admin (checked via user_roles).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

interface ExtractedProduct {
  name: string;
  image_url: string;
  product_url: string;
  price: number | null;
  currency: string | null;
  category: string;
}

const absolutize = (maybeUrl: string, base: string): string => {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
};

const trimHtmlForLLM = (html: string, max = 180_000): string => {
  // Strip scripts/styles/comments to keep tokens down
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ');
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
};

async function callLovableAI(prompt: string): Promise<ExtractedProduct[]> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'You are an e-commerce product extractor. Return ONLY a JSON array of products found on the page. No prose, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  // The model may return either {products:[...]} or [...] inside an object
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // try to salvage the first JSON array in the text
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('AI did not return valid JSON');
    parsed = JSON.parse(m[0]);
  }
  const arr: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.products)
      ? parsed.products
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];
  return arr
    .filter((p) => p && typeof p === 'object' && p.image_url && p.name)
    .map((p) => ({
      name: String(p.name).slice(0, 200),
      image_url: String(p.image_url),
      product_url: String(p.product_url || ''),
      price: p.price != null && !isNaN(Number(p.price)) ? Number(p.price) : null,
      currency: p.currency ? String(p.currency).slice(0, 8) : null,
      category: CATEGORIES.includes(String(p.category)) ? String(p.category) : 'tops',
    }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Auth: must be a signed-in admin ---
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'preview' | 'commit' = body.mode === 'commit' ? 'commit' : 'preview';

    // ---------- PREVIEW MODE ----------
    if (mode === 'preview') {
      const url: string = String(body.url || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        return new Response(JSON.stringify({ error: 'Provide a valid http(s) URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let html = '';
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; MirrorMeBot/1.0; +https://mirrorme.app)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        html = await resp.text();
      } catch (e) {
        return new Response(
          JSON.stringify({
            error:
              "Couldn't fetch that website. It may block bots (SHEIN/Zara/etc). Try the brand's product listing page directly.",
            details: String(e),
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const trimmed = trimHtmlForLLM(html);
      const prompt = `Extract every clothing/fashion product visible on this e-commerce page.
Return a JSON object: {"products":[{name, image_url, product_url, price, currency, category}, ...]}
- image_url MUST be a direct image URL (jpg/png/webp). If relative, leave as-is — I will resolve it.
- product_url: the link to that product's detail page (relative is OK).
- price: number only (no currency symbols).
- currency: 3-letter code if visible (USD, ZAR, EUR, GBP), else null.
- category: ONE of ${CATEGORIES.join(', ')}. Best guess from the product name.
- Skip non-product UI (logos, banners, icons, payment badges, model headshots without a product).
- Limit to the 50 most clearly-product items.

Page URL: ${url}
HTML:
${trimmed}`;

      let products: ExtractedProduct[];
      try {
        products = await callLovableAI(prompt);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `AI extraction failed: ${String(e)}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Resolve relative URLs against the fetched page
      const resolved = products.map((p) => ({
        ...p,
        image_url: absolutize(p.image_url, url),
        product_url: p.product_url ? absolutize(p.product_url, url) : '',
      }));

      // De-duplicate by image_url
      const seen = new Set<string>();
      const unique = resolved.filter((p) => {
        if (seen.has(p.image_url)) return false;
        seen.add(p.image_url);
        return true;
      });

      return new Response(JSON.stringify({ products: unique }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------- COMMIT MODE ----------
    const brandId: string = String(body.brand_id || '');
    const products: ExtractedProduct[] = Array.isArray(body.products) ? body.products : [];
    if (!brandId || products.length === 0) {
      return new Response(JSON.stringify({ error: 'brand_id and products[] required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: brand, error: brandErr } = await admin
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .maybeSingle();
    if (brandErr || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = products
      .filter((p) => p.image_url && p.name)
      .slice(0, 100)
      .map((p) => ({
        user_id: user.id,
        brand_name: brand.name,
        linked_brand_id: brand.id,
        product_name: p.name,
        product_image: p.image_url,
        category: CATEGORIES.includes(p.category) ? p.category : 'tops',
        price: p.price,
        currency: p.currency || 'ZAR',
        product_url: p.product_url || null,
        external_url: p.product_url || null,
        is_marketplace: true,
      }));

    const { error: insertErr, count } = await admin
      .from('brand_items')
      .insert(rows, { count: 'exact' });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ inserted: count ?? rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
